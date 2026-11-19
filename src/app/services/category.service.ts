import { Injectable, inject } from '@angular/core';
import { Category } from '../models/models';
import { StoreService } from './store.service';
@Injectable({ providedIn: 'root' })
export class CategoryService {
  private store = inject(StoreService);
  private validate(value: Category, categories = this.store.categories()): Category {
    const name = value.name.trim();
    if (!name || name.length > 40) throw new Error('Escribe un nombre de entre 1 y 40 caracteres.');
    if (!value.archived && categories.some(item => item.id !== value.id && !item.archived && item.type === value.type && (item.parentId || '') === (value.parentId || '') && item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('Ya existe una categoría con ese nombre.');
    const previous = this.store.categories().find(item => item.id === value.id);
    if (previous && previous.type !== value.type) throw new Error('El tipo de una categoría existente no se puede cambiar.');
    if (previous && (previous.parentId || '') !== (value.parentId || '')) throw new Error('La categoría general de una subcategoría existente no se puede cambiar.');
    const parent = this.store.categories().find(item => item.id === value.parentId);
    if (value.parentId && (!parent || parent.parentId || parent.type !== value.type || parent.archived && !previous)) throw new Error('Selecciona una categoría general activa del mismo tipo.');
    return { ...value, name };
  }
  async save(value: Category): Promise<void> {
    await this.store.save('categories', this.validate(value));
  }
  async saveFamily(value: Category, children: { id: string; name: string; removed: boolean }[]): Promise<void> {
    const values = [value, ...children.map(child => {
      const previous = this.store.categories().find(item => item.id === child.id && item.parentId === value.id);
      if (!previous) throw new Error('No se encontró la subcategoría.');
      return { ...previous, name: child.removed ? previous.name : child.name, archived: child.removed };
    })];
    const final = [...this.store.categories().filter(item => !values.some(value => value.id === item.id)), ...values];
    await this.store.saveCategories(values.map(item => this.validate(item, final)));
  }
  async archive(id: string): Promise<void> {
    const category = this.store.categories().find(item => item.id === id);
    if (category) await this.store.save('categories', { ...category, archived: true });
  }
}
