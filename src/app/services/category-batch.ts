import { doc, Firestore, runTransaction } from 'firebase/firestore';
import { assertUnchanged } from './records';
import { Category } from '../models/models';
export async function saveCategoryBatch(db: Firestore, coupleId: string, values: Category[], expected: Category[]): Promise<void> {
  await runTransaction(db, async transaction => {
    const refs = values.map(value => doc(db, 'couples', coupleId, 'categories', value.id));
    const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
    values.forEach((value, index) => assertUnchanged(snapshots[index].exists() ? snapshots[index].data() : undefined, expected.find(item => item.id === value.id)));
    values.forEach((value, index) => transaction.set(refs[index], { ...value, revision: (expected.find(item => item.id === value.id)?.revision || 0) + 1 }));
  });
}
