---
name: Arabic Agpeya Content
overview: Populate the empty Arabic book.md with content scraped from orsozox.org, then run the existing build pipeline to generate the book.json needed by the app. The app infrastructure (RTL, locale config, UI translations) is already in place.
todos:
  - id: scrape-script
    content: "Ecrire `scripts/scrape-ar-agpeya.mjs` : fetch des 9 pages orsozox.org, extraction du texte, gestion de l'encodage"
    status: pending
  - id: mapping
    content: Implementer le mapping contenu scrappe -> IDs du skeleton (psaumes par numero, evangiles par reference, sections communes par mots-cles)
    status: pending
  - id: generate-md
    content: Generer `public/agpia/ar/book.md` complet avec le contenu arabe dans le format markdown attendu
    status: pending
  - id: pipeline
    content: Executer `import` + `build` pour generer strings.json et book.json
    status: pending
  - id: verify
    content: Lancer l'app, tester la locale arabe (RTL, navigation, TOC, recherche)
    status: pending
isProject: false
---

# Plan : Agpeya arabe -- contenu et integration

## Etat des lieux

L'infrastructure applicative pour l'arabe est **deja prete** :

- Locale configuree dans `src/types.ts` (`code: 'ar', dir: 'rtl'`)
- Traductions UI completes dans `src/locales/ar.json`
- Support RTL en CSS (`[dir="rtl"]` rules, logical properties, police arabe)
- Le fichier `public/agpia/ar/book.md` existe avec la **structure complete** (~130 sections) mais **aucun contenu** (seulement des commentaires `<!-- fr: ... -->`)

**Ce qui manque : le contenu des prieres en arabe.**

## Source de contenu

**orsozox.org** est la meilleure source disponible :

- 9 pages HTML separees par heure : `Agpeya-ar1.htm` a `Agpeya-ar9.htm`
- Texte arabe complet de l'Agpeya
- Structure par heure : Prime, Tierce, Sexte, None, Vepres, Complies, Minuit (3 services)
- Probleme connu : l'encodage peut etre en `windows-1256` et non UTF-8 -- le script devra gerer ca

**Alternative de secours** : agpeya.org (anglais, tres propre) comme reference structurelle pour mapper les sections.

## Approche technique

```
orsozox.org (9 pages HTML)
        |
        v
scripts/scrape-ar-agpeya.mjs    <-- nouveau script
        |
        v
public/agpia/ar/book.md         <-- rempli avec le contenu arabe
        |
        v
book-tool.mjs import             <-- genere strings.json
        |
        v
book-tool.mjs build              <-- genere book.json
        |
        v
Application prete
```

## Etape 1 : Script de scraping (`scripts/scrape-ar-agpeya.mjs`)

Script Node.js (pas de dependance externe, utilise `fetch` natif + un decodeur d'encodage) qui :

1. Telecharge les 9 pages HTML d'orsozox.org
2. Decoupe le HTML en sections (chaque page = une heure)
3. Extrait le texte brut des prieres en preservant la structure (titres, paragraphes, instructions)
4. Sauvegarde le contenu brut dans un fichier intermediaire (`public/agpia/ar/scraped-raw.json`) pour debug

## Etape 2 : Mapping contenu -> skeleton

Le script doit mapper le contenu scrappe aux ~130 IDs du skeleton. Strategie :

- **Psaumes** : identifier par numero (ex. "مزمور 1" -> `psalm1`). La numerotation Septante est utilisee dans le skeleton et dans l'Agpeya arabe.
- **Evangiles** : identifier par les references bibliques ("يوحنا 1" -> `dawn-gospel`)
- **Sections communes** (intro, conclusion, credo, trisagion, etc.) : identifier par mots-cles arabes connus
- **Oraisons/tropaires** : mapper par position relative dans chaque heure
- **Sections speciales** (prieres du voile, absolutions, prieres diverses) : mapper manuellement si necessaire

Reference structurelle : utiliser `public/agpia/fr-apollos/book.md` comme guide pour l'ordre et le nombre de blocs attendus par section.

## Etape 3 : Generation du book.md arabe

Le script ecrit le `book.md` final en respectant le format exact :

```markdown
---

<a id="psalm1"></a>

## مزمور ١

طوبى للرجل الذي لم يسلك في مشورة الأشرار...

---
```

Chaque section doit :

- Avoir l'anchor `<a id="...">` correspondant au skeleton
- Avoir un titre `##` en arabe
- Avoir le bon nombre de paragraphes/blocs pour correspondre au skeleton

## Etape 4 : Pipeline de build

```bash
node scripts/book-tool.mjs import public/agpia/ar/book.md
node scripts/book-tool.mjs build
```

Cela genere :

- `public/agpia/ar/strings.json` (cles extraites du markdown)
- `public/agpia/ar/book.json` (fichier final consomme par l'app)

## Etape 5 : Verification

- Lancer l'app en locale arabe
- Verifier que le contenu s'affiche correctement en RTL
- Verifier la navigation entre chapitres
- Verifier la table des matieres
- Verifier la recherche en arabe

## Risques et points d'attention

- **Encodage** : orsozox.org utilise possiblement `windows-1256`. Le script doit detecter et convertir en UTF-8.
- **Correspondance des blocs** : le nombre de paragraphes dans le contenu scrappe doit correspondre exactement au nombre de blocs dans le skeleton. Des ajustements manuels seront probablement necessaires.
- **Sections partagees** : les intros et conclusions sont dupliquees entre les heures. Seule `dawn-intro` a un anchor dans book.md ; les autres doivent etre copiees dans `strings.json` apres l'import (comme documente dans les regles du projet).
- **Prieres hors-heures** : les sections "absolutions" et "prieres diverses" (`prayer-repentance`, `prayer-before-communion`, etc.) ne sont peut-etre pas presentes dans la source orsozox.org. Elles devront etre trouvees ailleurs ou laissees vides temporairement.

