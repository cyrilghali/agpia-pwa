# Schéma du contenu livre (AGPIA)

Ce dossier définit la **forme canonique** des fichiers `public/agpia/{locale}/book.json`, pour que toutes les langues et traductions aient la même structure.

## Règle principale

- **Structure et ids** : identiques dans toutes les langues (même ordre du TOC, mêmes `id` aux entrées et aux chapitres, même arborescence `children`).
- **Traduits** : uniquement `metadata.title`, les champs `title` du TOC et des chapitres, et le contenu des `blocks` (texte, légendes, etc.).

Ainsi, les extractions (epub → json) et les traductions doivent produire un JSON qui respecte ce schéma et qui **aligner les ids** sur une version de référence (ex. française).

## Fichiers

- **agpia-book.schema.json** : schéma JSON Schema pour valider un `book.json`. Utilisable en CI ou en script (ex. avec `ajv` ou `jsonschema`).

## Structure du TOC

Chaque entrée de la table des matières :

| Champ     | Type     | Rôle |
|----------|----------|------|
| `id`     | string   | **Stable** – même valeur dans toutes les langues (ex. `part003`, `part003-intro`) |
| `title`  | string   | **Traduit** – libellé affiché |
| `children` | array? | **Structure stable** – mêmes ids et même ordre que les autres langues |

Les entrées de premier niveau correspondent aux heures de prière (ou sections). Les `children` sont les chapitres/sous-parties de cette section.

**Introduction par heure** : il n'y a pas d'introduction globale (`part001`). Chaque heure possède son propre chapitre d'introduction dont l'id est `{hourId}-intro` (ex. `part003-intro`, `part036-intro`). Ce chapitre doit apparaître comme premier `children` de l'heure dans le TOC et comme premier chapitre de l'heure dans `chapters`. Les nouvelles langues et les pipelines de génération (epub → json) doivent produire directement cette structure.

## Structure des chapitres

Chaque élément de `chapters` :

| Champ   | Type   | Rôle |
|--------|--------|------|
| `id`   | string | **Stable** – doit correspondre à une entrée du TOC |
| `title`| string | **Traduit** |
| `hourId` | string \| null | **Stable** – id de l’heure (ex. `part003`) ou `null` |
| `blocks` | array | Contenu (traduit) ; les `type` de bloc sont fixes |

## Validation

Exemple avec Node et le package `ajv` :

```bash
npx ajv validate -s schemas/agpia-book.schema.json -d public/agpia/fr/book.json
```
