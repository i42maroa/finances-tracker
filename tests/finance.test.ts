import { describe, expect, it } from 'vitest';
import { calculateDebt, eurosToCents, share, summarize } from '../src/app/services/finance';
import { Movement, Settlement } from '../src/app/models/models';
const members = ['a', 'b'];
function movement(overrides: Partial<Movement> = {}): Movement {
  return { id: '1', type: 'expense', amountCents: 6000, date: '2026-11-01', concept: 'Cena', categoryId: 'food', space: 'shared', ownerId: 'a', actorId: 'a', payment: 'single', createdBy: 'a', createdAt: '', updatedAt: '', ...overrides };
}
function settlement(fromId: string, amountCents: number): Settlement {
  return { id: 's', amountCents, date: '2026-11-01', fromId, toId: fromId === 'a' ? 'b' : 'a', note: '', createdBy: fromId, createdAt: '', updatedAt: '' };
}
describe('Importes exactos en céntimos', () => {
  it('admite coma, punto y enteros sin errores binarios', () => { expect(eurosToCents('19,99')).toBe(1999); expect(eurosToCents('0.29')).toBe(29); expect(eurosToCents(10)).toBe(1000); });
  it.each(['0', '-1', '1.001', 'NaN', '1e3', '', '1000000.01', '1,2,3'])('rechaza %s', value => expect(() => eurosToCents(value)).toThrow());
  it('reparte el céntimo impar de forma estable y conserva el total', () => { expect(share(101, members, 'a')).toBe(51); expect(share(101, members, 'b')).toBe(50); });
});
describe('Balance de deudas acumulado', () => {
  it('compensa cena de 60 y compra de 40 del ejemplo acordado', () => {
    expect(calculateDebt([movement(), movement({ actorId: 'b', amountCents: 4000 })], [], members)).toEqual({ amountCents: 1000, fromId: 'b', toId: 'a' });
  });
  it('el pago a medias no cambia la deuda, ni con importes impares', () => { expect(calculateDebt([movement({ payment: 'half', amountCents: 101 })], [], members).amountCents).toBe(0); });
  it('los ingresos comunes invierten el sentido de la deuda', () => { expect(calculateDebt([movement({ type: 'income', amountCents: 10000 })], [], members)).toEqual({ amountCents: 5000, fromId: 'a', toId: 'b' }); });
  it('compensa ingresos comunes y gastos', () => { expect(calculateDebt([movement({ amountCents: 10000 }), movement({ type: 'income', amountCents: 4000 })], [], members).amountCents).toBe(3000); });
  it('ignora movimientos individuales, aunque los pague el otro', () => { expect(calculateDebt([movement({ space: 'individual', actorId: 'b' })], [], members).amountCents).toBe(0); });
  it('reduce y salda con liquidaciones y refleja sobrepagos', () => {
    expect(calculateDebt([movement()], [settlement('b', 1000)], members).amountCents).toBe(2000);
    expect(calculateDebt([movement()], [settlement('b', 3000)], members).amountCents).toBe(0);
    expect(calculateDebt([movement()], [settlement('b', 4000)], members)).toEqual({ amountCents: 1000, fromId: 'a', toId: 'b' });
  });
  it('un envío contrario aumenta la deuda', () => { expect(calculateDebt([movement()], [settlement('a', 1000)], members).amountCents).toBe(4000); });
  it('no depende de la fecha ni del mes actual', () => { expect(calculateDebt([movement({ date: '2020-01-01' })], [], members).amountCents).toBe(3000); });
  it('refleja ediciones y eliminaciones recalculando los registros vigentes', () => {
    expect(calculateDebt([movement({ amountCents: 2000 })], [], members).amountCents).toBe(1000);
    expect(calculateDebt([], [], members).amountCents).toBe(0);
  });
  it('no calcula deudas para una pareja incompleta', () => { expect(calculateDebt([movement()], [], ['a']).amountCents).toBe(0); });
});
describe('Balances individuales y compartidos', () => {
  const rows = [movement({ type: 'income', space: 'individual', amountCents: 200000 }), movement({ space: 'individual', ownerId: 'b', amountCents: 10000 }), movement(), movement({ type: 'income', actorId: 'b', amountCents: 10000 })];
  it('el balance individual excluye al otro y permite excluir lo común', () => { expect(summarize(rows, members, 'a', false)).toEqual({ incomeCents: 200000, expenseCents: 0, netCents: 200000 }); });
  it('incluye la mitad de todo lo común con independencia del pagador y registrador', () => { expect(summarize(rows, members, 'a', true)).toEqual({ incomeCents: 205000, expenseCents: 3000, netCents: 202000 }); });
  it('las atribuciones personales suman exactamente el importe original', () => {
    const odd = [movement({ amountCents: 101 }), movement({ type: 'income', amountCents: 301 })];
    const a = summarize(odd, members, 'a'), b = summarize(odd, members, 'b'), total = summarize(odd, members);
    expect(a.incomeCents + b.incomeCents).toBe(total.incomeCents); expect(a.expenseCents + b.expenseCents).toBe(total.expenseCents);
  });
  it('devuelve cero sin movimientos', () => { expect(summarize([], members)).toEqual({ incomeCents: 0, expenseCents: 0, netCents: 0 }); });
});
