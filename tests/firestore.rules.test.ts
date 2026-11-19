import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, or, query, where, runTransaction, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';
let env: RulesTestEnvironment;
const cid = 'couple-test', code = 'ABCDEF0123456789ABCD', now = new Date().toISOString();
const db = (uid: string) => env.authenticatedContext(uid).firestore();
async function create(uid = 'a', invite = code, id = cid) {
  const firestore = db(uid), batch = writeBatch(firestore);
  batch.set(doc(firestore, 'users', uid), { uid, name: uid, email: `${uid}@test.local`, coupleId: id });
  batch.set(doc(firestore, 'couples', id), { memberIds: [uid], memberNames: { [uid]: uid }, inviteCode: invite, createdAt: now });
  batch.set(doc(firestore, 'invites', invite), { coupleId: id, createdBy: uid, ownerName: uid, expiresAt: Timestamp.fromMillis(Date.now() + 86400000) });
  batch.set(doc(firestore, 'couples', id, 'categories', 'food'), { id: 'food', type: 'expense', name: 'Comida', icon: '✧', archived: false });
  await batch.commit();
}
async function join(uid = 'b', invite = code) {
  const firestore = db(uid);
  await runTransaction(firestore, async transaction => {
    const profile = await transaction.get(doc(firestore, 'users', uid));
    const invitation = await transaction.get(doc(firestore, 'invites', invite));
    if (profile.data()?.['coupleId'] || !invitation.exists()) throw new Error('Not available');
    const id = invitation.data()['coupleId'] as string;
    transaction.update(doc(firestore, 'couples', id), { memberIds: arrayUnion(uid), [`memberNames.${uid}`]: uid });
    transaction.set(doc(firestore, 'users', uid), { uid, name: uid, email: `${uid}@test.local`, coupleId: id });
    transaction.delete(doc(firestore, 'invites', invite));
  });
}
function movement(overrides = {}) { return { id: 'm', type: 'expense', amountCents: 6000, date: '2026-11-01', concept: 'Cena', categoryId: 'food', space: 'shared', ownerId: 'a', actorId: 'a', payment: 'single', createdBy: 'a', createdAt: now, updatedAt: now, ...overrides }; }
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'demo-hucha', firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } }); });
beforeEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });
describe('Vinculación y acceso', () => {
  it('crea pareja, perfil, invitación y categorías de forma atómica', async () => { await assertSucceeds(create()); await assertSucceeds(getDoc(doc(db('a'), 'couples', cid))); });
  it('vincula al segundo miembro y consume el código', async () => { await create(); await assertSucceeds(join()); expect((await getDoc(doc(db('a'), 'couples', cid))).data()?.['memberIds']).toEqual(['a', 'b']); expect((await getDoc(doc(db('b'), 'invites', code))).exists()).toBe(false); });
  it('no permite consultar pareja ni movimientos a un tercero', async () => { await create(); await join(); await assertFails(getDoc(doc(db('c'), 'couples', cid))); await assertFails(getDocs(collection(db('c'), 'couples', cid, 'movements'))); });
  it('no permite acceso anónimo ni enumerar invitaciones', async () => { await create(); await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'invites', code))); await assertFails(getDocs(collection(db('c'), 'invites'))); });
  it('no admite un tercer miembro ni reutilizar un código', async () => { await create(); await join(); await expect(join('c')).rejects.toThrow(); await assertFails(updateDoc(doc(db('c'), 'couples', cid), { memberIds: arrayUnion('c'), 'memberNames.c': 'c' })); });
  it('solo una de dos incorporaciones simultáneas puede ganar', async () => { await create(); const results = await Promise.allSettled([join('b'), join('c')]); expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1); expect((await getDoc(doc(db('a'), 'couples', cid))).data()?.['memberIds']).toHaveLength(2); });
  it('rechaza invitaciones caducadas incluso si el cliente intenta usarlas', async () => { await create(); await env.withSecurityRulesDisabled(async context => { await updateDoc(doc(context.firestore(), 'invites', code), { expiresAt: Timestamp.fromMillis(1) }); }); await assertFails(join()); });
  it('no permite abandonar una pareja cambiando el perfil ni pertenecer a dos', async () => { await create(); await join(); await assertFails(create('b', '11111111111111111111', 'second')); await assertFails(updateDoc(doc(db('a'), 'users', 'a'), { coupleId: 'other' })); });
  it('no permite cambiar miembros existentes ni añadir campos', async () => { await create(); await join(); await assertFails(updateDoc(doc(db('a'), 'couples', cid), { memberIds: ['a', 'c'] })); await assertFails(updateDoc(doc(db('a'), 'couples', cid), { admin: true })); });
  it('no permite crear una pareja apuntando a la invitación de otra', async () => {
    await create(); const firestore = db('b'), batch = writeBatch(firestore);
    batch.set(doc(firestore, 'users', 'b'), { uid: 'b', name: 'b', email: 'b@test.local', coupleId: 'other' });
    batch.set(doc(firestore, 'couples', 'other'), { memberIds: ['b'], memberNames: { b: 'b' }, inviteCode: code, createdAt: now });
    await assertFails(batch.commit());
  });
  it('no permite renovar usando una invitación de otra pareja', async () => {
    await create(); const otherCode = '22222222222222222222'; await create('c', otherCode, 'other');
    const firestore = db('a'), batch = writeBatch(firestore);
    batch.update(doc(firestore, 'couples', cid), { inviteCode: otherCode }); batch.delete(doc(firestore, 'invites', code));
    await assertFails(batch.commit());
  });
  it('renueva el código e invalida el anterior', async () => {
    await create(); const firestore = db('a'), batch = writeBatch(firestore), replacement = '11111111111111111111';
    batch.update(doc(firestore, 'couples', cid), { inviteCode: replacement }); batch.delete(doc(firestore, 'invites', code));
    batch.set(doc(firestore, 'invites', replacement), { coupleId: cid, createdBy: 'a', ownerName: 'a', expiresAt: Timestamp.fromMillis(Date.now() + 86400000) });
    await assertSucceeds(batch.commit()); await expect(join('b', code)).rejects.toThrow(); await assertSucceeds(join('b', replacement));
  });
});
describe('Validación de registros y permisos simétricos', () => {
  beforeEach(async () => { await create(); await join(); });
  it('valida la jerarquía y conserva subcategorías archivadas en su historial', async () => {
    const firestore = db('a');
    const child = { id: 'child', name: 'Fruta', type: 'expense', icon: '·', archived: false, parentId: 'food' };
    const ref = doc(firestore, 'couples', cid, 'categories', 'child');
    await assertFails(setDoc(ref, { ...child, parentId: 'missing' }));
    await assertFails(setDoc(ref, { ...child, parentId: 'child' }));
    await assertFails(setDoc(ref, { ...child, type: 'income' }));
    await assertSucceeds(setDoc(ref, child));
    await assertFails(setDoc(doc(firestore, 'couples', cid, 'categories', 'nested'), { ...child, id: 'nested', parentId: 'child' }));
    await assertFails(updateDoc(ref, { parentId: '' }));
    const movementRef = doc(firestore, 'couples', cid, 'movements', 'm');
    await assertFails(setDoc(movementRef, movement({ subcategoryId: 'missing' })));
    await assertFails(setDoc(movementRef, movement({ categoryId: 'child' })));
    await assertSucceeds(setDoc(movementRef, movement({ subcategoryId: 'child' })));
    await assertSucceeds(updateDoc(ref, { archived: true }));
    await assertSucceeds(updateDoc(movementRef, { concept: 'Historial' }));
    await assertFails(setDoc(doc(firestore, 'couples', cid, 'movements', 'new'), movement({ id: 'new', subcategoryId: 'child' })));
    await assertSucceeds(updateDoc(movementRef, { subcategoryId: '' }));
    await assertFails(updateDoc(movementRef, { subcategoryId: 'child' }));
  });
  it('protege los movimientos individuales frente al otro miembro', async () => {
    const own = doc(db('a'), 'couples', cid, 'movements', 'm');
    const other = doc(db('b'), 'couples', cid, 'movements', 'm');
    await assertSucceeds(setDoc(own, movement({ space: 'individual' })));
    await assertSucceeds(getDoc(own));
    await assertFails(getDoc(other));
    await assertFails(updateDoc(other, { concept: 'Ajeno' }));
    await assertFails(updateDoc(other, { space: 'shared' }));
    await assertFails(deleteDoc(other));
    await assertFails(updateDoc(own, { ownerId: 'b' }));
    await assertFails(setDoc(doc(db('b'), 'couples', cid, 'movements', 'for-a'), movement({ id: 'for-a', space: 'individual', createdBy: 'b' })));
    await assertSucceeds(updateDoc(own, { concept: 'Propio' }));
    await assertSucceeds(deleteDoc(own));
  });
  it('consulta solo Hogar y los movimientos propios de cada cuenta', async () => {
    await setDoc(doc(db('a'), 'couples', cid, 'movements', 'shared'), movement({ id: 'shared' }));
    await setDoc(doc(db('a'), 'couples', cid, 'movements', 'own-a'), movement({ id: 'own-a', space: 'individual' }));
    await setDoc(doc(db('b'), 'couples', cid, 'movements', 'own-b'), movement({ id: 'own-b', space: 'individual', ownerId: 'b', actorId: 'b', createdBy: 'b' }));
    for (const uid of ['a', 'b']) {
      const movements = collection(db(uid), 'couples', cid, 'movements');
      await assertFails(getDocs(movements));
      const result = await assertSucceeds(getDocs(query(movements, or(where('space', '==', 'shared'), where('ownerId', '==', uid)))));
      expect(result.docs.map(item => item.id).sort()).toEqual([`own-${uid}`, 'shared']);
    }
  });
  it('admite descripción opcional y valida su tipo y longitud', async () => {
    const ref = doc(db('a'), 'couples', cid, 'movements', 'm');
    await assertSucceeds(setDoc(ref, movement()));
    await assertSucceeds(updateDoc(ref, { description: 'Detalle del gasto' }));
    await assertSucceeds(updateDoc(ref, { description: '' }));
    await assertSucceeds(updateDoc(ref, { description: 'a'.repeat(1000) }));
    await assertFails(updateDoc(ref, { description: 'a'.repeat(1001) }));
    await assertFails(updateDoc(ref, { description: 123 }));
  });
  it('permite compartir ingresos y conserva la privacidad de los individuales', async () => {
    await setDoc(doc(db('a'), 'couples', cid, 'categories', 'salary'), { id: 'salary', type: 'income', name: 'Nómina', icon: '+', archived: false });
    const value = movement({ type: 'income', categoryId: 'salary' });
    const ref = doc(db('a'), 'couples', cid, 'movements', 'm');
    await assertSucceeds(setDoc(ref, value));
    await assertFails(setDoc(ref, { ...value, space: 'individual', actorId: 'b' }));
    await assertSucceeds(setDoc(ref, { ...value, space: 'individual' }));
    await assertFails(getDoc(doc(db('b'), 'couples', cid, 'movements', 'm')));
    await assertFails(updateDoc(doc(db('b'), 'couples', cid, 'movements', 'm'), { space: 'shared' }));
    await assertSucceeds(updateDoc(ref, { space: 'shared' }));
    await assertSucceeds(getDoc(doc(db('b'), 'couples', cid, 'movements', 'm')));
    await assertSucceeds(updateDoc(doc(db('b'), 'couples', cid, 'movements', 'm'), { amountCents: 7000 }));
    await assertSucceeds(updateDoc(ref, { space: 'individual' }));
  });
  it('ambos pueden editar y eliminar movimientos del otro', async () => { await assertSucceeds(setDoc(doc(db('a'), 'couples', cid, 'movements', 'm'), movement())); await assertSucceeds(updateDoc(doc(db('b'), 'couples', cid, 'movements', 'm'), { amountCents: 4000 })); await assertSucceeds(deleteDoc(doc(db('b'), 'couples', cid, 'movements', 'm'))); });
  it.each([{ amountCents: -1 }, { amountCents: 1.5 }, { amountCents: 100000001 }, { type: 'income' }, { actorId: 'c' }, { concept: '' }, { space: 'private' }, { payment: 'half', space: 'individual' }, { createdBy: 'b' }])('rechaza movimiento malformado: %j', async overrides => { await assertFails(setDoc(doc(db('a'), 'couples', cid, 'movements', 'm'), movement(overrides))); });
  it('archiva categorías conservando movimientos y rechaza nuevas altas con esa categoría', async () => {
    await setDoc(doc(db('a'), 'couples', cid, 'movements', 'm'), movement());
    await assertSucceeds(updateDoc(doc(db('b'), 'couples', cid, 'categories', 'food'), { archived: true }));
    await assertSucceeds(updateDoc(doc(db('b'), 'couples', cid, 'movements', 'm'), { concept: 'Cena editada' }));
    await assertFails(setDoc(doc(db('a'), 'couples', cid, 'movements', 'new'), movement({ id: 'new' })));
    await assertFails(deleteDoc(doc(db('a'), 'couples', cid, 'categories', 'food')));
    await assertFails(updateDoc(doc(db('a'), 'couples', cid, 'categories', 'food'), { type: 'income' }));
  });
  it('valida liquidaciones y permite editarlas al otro miembro', async () => {
    const ref = doc(db('a'), 'couples', cid, 'settlements', 's');
    const value = { id: 's', amountCents: 1000, date: '2026-11-01', fromId: 'a', toId: 'b', note: '', createdBy: 'a', createdAt: now, updatedAt: now };
    await assertFails(setDoc(ref, { ...value, toId: 'a' })); await assertFails(setDoc(ref, { ...value, toId: 'c' })); await assertSucceeds(setDoc(ref, value));
    await assertSucceeds(updateDoc(doc(db('b'), 'couples', cid, 'settlements', 's'), { amountCents: 500 }));
    await assertSucceeds(deleteDoc(doc(db('b'), 'couples', cid, 'settlements', 's')));
  });
});
