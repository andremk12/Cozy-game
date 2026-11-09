// Local pet identifiers are shared by selection, rendering and persistence.
export const PETS = Object.freeze([
  Object.freeze({ id: 'cat', label: 'Gatinho', defaultName: 'Seu gatinho', renderer: 'svg' }),
  Object.freeze({ id: 'dalmatian', label: 'Dálmata', defaultName: 'Seu dálmata', renderer: 'spritesheet',
    manifestPath: 'assets/pets/dalmatian/animation-manifest.json' }),
]);

export function getPetDefinition(id) {
  return PETS.find((pet) => pet.id === id) ?? PETS[0];
}
