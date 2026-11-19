import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, or, query, where, runTransaction, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { RecurringMovement } from '../src/app/models/models';
import { recurringSchedule } from '../src/app/services/recurring';
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
function recurring(overrides: Partial<RecurringMovement> = {}): RecurringMovement {
  return { id: 'r', type: 'expense', amountCents: 6000, concept: 'Alquiler', description: '', categoryId: 'food', subcategoryId: '', space: 'shared', ownerId: 'a', actorId: 'a', payment: 'single', startDate: '2026-11-01', endDate: '', days: [2, 25], enabled: true, effectiveFrom: '2026-11-01', createdBy: 'a', createdAt: now, updatedAt: now, revision: 1, history: [], ...overrides };
}
describe('Recurrencias, historial y confirmación', () => {
  beforeEach(async () => { await create(); await join(); });
  it('permite gestionar Hogar a ambos y protege las recurrencias individuales y las consultas', async () => {
    const ref = doc(db('a'), 'couples', cid, 'recurringMovements', 'r');
    await assertSucceeds(setDoc(ref, recurring({ space: 'individual' })));
    await assertSucceeds(getDoc(ref));
    await assertFails(getDoc(doc(db('b'), 'couples', cid, 'recurringMovements', 'r')));
    await assertFails(getDoc(doc(db('c'), 'couples', cid, 'recurringMovements', 'r')));
    await assertFails(updateDoc(doc(db('b'), 'couples', cid, 'recurringMovements', 'r'), { enabled: false }));
    await assertFails(deleteDoc(ref));
    const shared = recurring({ id: 'shared' });
    await assertSucceeds(setDoc(doc(db('a'), 'couples', cid, 'recurringMovements', 'shared'), shared));
    await assertSucceeds(getDoc(doc(db('b'), 'couples', cid, 'recurringMovements', 'shared')));
    await assertFails(getDocs(collection(db('b'), 'couples', cid, 'recurringMovements')));
    const result = await assertSucceeds(getDocs(query(collection(db('b'), 'couples', cid, 'recurringMovements'), or(where('space', '==', 'shared'), where('ownerId', '==', 'b')))));
    expect(result.docs.map(item => item.id)).toEqual(['shared']);
  });
  it('valida calendario, importes, categorías y autoría e impide inventar un historial inicial', async () => {
    const ref = doc(db('a'), 'couples', cid, 'recurringMovements', 'r');
    for (const invalid of [{ days: [] }, { days: [0] }, { days: [32] }, { days: [2, 2] }, { days: ['2'] }, { amountCents: 0 }, { endDate: '2026-10-01' }, { type: 'income' }, { categoryId: 'missing' }, { ownerId: 'c' }, { revision: 2 }, { createdBy: 'b' }, { history: [{}] }]) {
      await assertFails(setDoc(ref, { ...recurring(), ...invalid }));
    }
    await assertSucceeds(setDoc(ref, recurring({ days: [1, 15, 31], endDate: '2027-03-01' })));
  });
  it('exige conservar las versiones anteriores y detecta ediciones simultáneas', async () => {
    const original = recurring(), effectiveFrom = '2026-11-19';
    const ref = doc(db('a'), 'couples', cid, 'recurringMovements', 'r');
    await setDoc(ref, original);
    const updated = { ...original, amountCents: 7000, effectiveFrom, revision: 2, history: [{ ...recurringSchedule(original), effectiveUntil: effectiveFrom }] };
    await assertFails(setDoc(ref, { ...updated, history: [] }));
    await assertSucceeds(setDoc(doc(db('b'), 'couples', cid, 'recurringMovements', 'r'), updated));
    await assertFails(setDoc(ref, { ...updated, amountCents: 8000 }));
    await assertFails(setDoc(ref, { ...updated, space: 'individual', revision: 3, history: [...updated.history, { ...recurringSchedule(updated), effectiveUntil: effectiveFrom }] }));
    const paused = { ...updated, enabled: false, revision: 3, history: [...updated.history, { ...recurringSchedule(updated), effectiveUntil: effectiveFrom }] };
    await assertSucceeds(setDoc(ref, paused));
    await assertFails(setDoc(ref, { ...paused, revision: 4, history: [...paused.history.slice(1), { ...recurringSchedule(paused), effectiveUntil: effectiveFrom }] }));
  });
  it('confirma una sola vez aunque ambos miembros intenten hacerlo a la vez', async () => {
    await setDoc(doc(db('a'), 'couples', cid, 'recurringMovements', 'r'), recurring());
    const id = 'recurring-r-2026-11-02';
    const confirm = (uid: string) => {
      const firestore = db(uid);
      return runTransaction(firestore, async transaction => {
        const ref = doc(firestore, 'couples', cid, 'movements', id);
        if ((await transaction.get(ref)).exists()) return false;
        transaction.set(ref, movement({ id, recurringId: 'r', scheduledDate: '2026-11-02', status: 'confirmed', createdBy: uid }));
        return true;
      });
    };
    const results = await Promise.all([confirm('a'), confirm('b')]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const ref = doc(db('a'), 'couples', cid, 'movements', id);
    await assertSucceeds(updateDoc(ref, { date: '2026-11-03', amountCents: 7000 }));
    await assertFails(updateDoc(ref, { scheduledDate: '2026-11-03' }));
    await assertFails(updateDoc(ref, { recurringId: 'missing' }));
    await assertSucceeds(updateDoc(ref, { status: 'skipped' }));
    await assertFails(deleteDoc(ref));
  });
  it('permite adelantar una recurrencia que todavía no había empezado', async () => {
    const original = recurring({ startDate: '2026-12-01', effectiveFrom: '2026-12-01' });
    const ref = doc(db('a'), 'couples', cid, 'recurringMovements', 'r');
    await setDoc(ref, original);
    await assertSucceeds(setDoc(ref, { ...original, startDate: '2026-11-20', effectiveFrom: '2026-11-19', revision: 2, history: [{ ...recurringSchedule(original), effectiveUntil: '2026-11-19' }] }));
  });
  it('no guarda pendientes como realizados ni acepta enlaces a recurrencias ajenas', async () => {
    await setDoc(doc(db('a'), 'couples', cid, 'recurringMovements', 'r'), recurring());
    const id = 'recurring-r-2026-11-02', ref = doc(db('a'), 'couples', cid, 'movements', id);
    const value = movement({ id, recurringId: 'r', scheduledDate: '2026-11-02', status: 'confirmed' });
    await assertFails(setDoc(ref, { ...value, status: 'pending' }));
    await assertFails(setDoc(ref, { ...value, recurringId: 'missing' }));
    await assertFails(setDoc(ref, { ...value, space: 'individual' }));
    await assertFails(setDoc(doc(db('a'), 'couples', cid, 'movements', 'wrong'), { ...value, id: 'wrong' }));
    await assertSucceeds(setDoc(ref, { ...value, status: 'skipped' }));
    await assertFails(setDoc(doc(db('a'), 'couples', cid, 'movements', 'manual'), movement({ id: 'manual', status: 'pending' })));
  });
  it('permite confirmar un pendiente histórico aunque se archive su categoría', async () => {
    await setDoc(doc(db('a'), 'couples', cid, 'recurringMovements', 'r'), recurring());
    await updateDoc(doc(db('a'), 'couples', cid, 'categories', 'food'), { archived: true });
    const id = 'recurring-r-2026-11-02';
    await assertSucceeds(setDoc(doc(db('b'), 'couples', cid, 'movements', id), movement({ id, recurringId: 'r', scheduledDate: '2026-11-02', status: 'confirmed', createdBy: 'b' })));
  });
});
describe('Subcategoría predeterminada', () => {
  beforeEach(async () => { await create(); await join(); });
  async function child(id = 'child', parentId = 'food') {
    const firestore = db('a');
    if (parentId !== 'food') await setDoc(doc(firestore, 'couples', cid, 'categories', parentId), { id: parentId, name: parentId, type: 'expense', icon: '+', archived: false });
    await setDoc(doc(firestore, 'couples', cid, 'categories', id), { id, name: id, parentId, type: 'expense', icon: '+', archived: false });
  }
  it('valida la pertenencia, el tipo de dato y que sea una subcategoría activa', async () => {
    await child(); await child('foreign', 'other');
    const ref = doc(db('a'), 'couples', cid, 'categories', 'food');
    for (const value of ['missing', 'food', 'foreign', 3, null]) await assertFails(updateDoc(ref, { defaultSubcategoryId: value }));
    await assertSucceeds(updateDoc(doc(db('b'), 'couples', cid, 'categories', 'food'), { defaultSubcategoryId: 'child' }));
    await assertFails(updateDoc(doc(db('c'), 'couples', cid, 'categories', 'food'), { defaultSubcategoryId: '' }));
    await assertFails(updateDoc(doc(db('a'), 'couples', cid, 'categories', 'child'), { defaultSubcategoryId: 'foreign' }));
    await assertSucceeds(updateDoc(ref, { defaultSubcategoryId: '' }));
  });
  it('archiva el valor predeterminado solo si se limpia la referencia en el mismo guardado', async () => {
    await child();
    const firestore = db('a'), parent = doc(firestore, 'couples', cid, 'categories', 'food'), selected = doc(firestore, 'couples', cid, 'categories', 'child');
    await updateDoc(parent, { defaultSubcategoryId: 'child' });
    await assertFails(updateDoc(selected, { archived: true }));
    const batch = writeBatch(firestore);
    batch.update(parent, { defaultSubcategoryId: '' }); batch.update(selected, { archived: true });
    await assertSucceeds(batch.commit());
    await assertFails(updateDoc(parent, { defaultSubcategoryId: 'child' }));
    await assertSucceeds(updateDoc(parent, { name: 'Categoría sin predeterminado' }));
  });
});
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
