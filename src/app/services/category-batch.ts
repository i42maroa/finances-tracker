import { doc, Firestore, writeBatch } from 'firebase/firestore';
import { Category } from '../models/models';
export async function saveCategoryBatch(db: Firestore, coupleId: string, values: Category[]): Promise<void> {
  const batch = writeBatch(db);
  for (const value of values) batch.set(doc(db, 'couples', coupleId, 'categories', value.id), value);
  await batch.commit();
}
