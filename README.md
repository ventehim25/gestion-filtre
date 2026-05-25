# Gestion Filtres — إدارة الفلاتر

Application de gestion pour vendeur de pièces auto (filtres) au Maroc.
تطبيق إدارة لبائع قطع غيار السيارات (فلاتر) بالمغرب.

## Stack

- **Frontend** : Next.js 15 + TypeScript + Tailwind CSS
- **Backend / DB** : Supabase (PostgreSQL)
- **Déploiement** : Vercel

## Fonctionnalités

- Catalogue produits (filtres huile, air, carburant, habitacle…)
- Gestion clients avec ville et téléphone
- Suivi des ventes et paiements
- Planification des tournées par ville
- Interface bilingue Français / Arabe (RTL)
- Alertes stock faible

---

## Installation

### 1. Prérequis

- [Node.js 18+](https://nodejs.org)
- [Git](https://git-scm.com)
- Compte [Supabase](https://supabase.com)
- Compte [Vercel](https://vercel.com)
- Compte [GitHub](https://github.com)

### 2. Cloner et installer

```bash
git clone https://github.com/TON_USER/gestion-filtre.git
cd gestion-filtre
npm install
```

### 3. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **SQL Editor** et exécuter le contenu de `supabase/migrations/001_initial_schema.sql`
3. Copier l'**URL** et la **clé anon** depuis *Settings > API*

### 4. Variables d'environnement

```bash
cp .env.local.example .env.local
```

Remplir `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Lancer en développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## Déploiement sur Vercel

1. Pousser le code sur GitHub
2. Aller sur [vercel.com](https://vercel.com) → **New Project** → importer le repo GitHub
3. Ajouter les variables d'environnement dans Vercel :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Cliquer **Deploy** ✓
