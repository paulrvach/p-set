The Convergence of React 19 and Next.js 15: A Comprehensive Architectural Report and Cursor Rules Definition
1. Executive Summary: The Era of Asynchronous Determinism
The web development landscape in 2025 has been defined by a singular, overarching theme: the maturation of the server-first architecture. The simultaneous stabilization of React 19 and the release of Next.js 15 marks the end of the experimental phase of React Server Components (RSC) and the beginning of their standardization. This report provides an exhaustive analysis of the architectural paradigms, performance optimizations, and developer experience (DX) shifts that characterize this new era. It serves as both a strategic guide for software architects and a technical specification for configuring AI-assisted development environments, specifically through the implementation of .cursorrules and .mdc context files.
The transition from the Next.js 14 ecosystem to Next.js 15 is not merely an iterative update; it represents a philosophical inversion in how data freshness and rendering lifecycles are handled. The "Cached by Default" strategy, which prioritized performance at the cost of data consistency and developer confusion, has been replaced by an "Uncached by Default" model. This aligns the framework more closely with standard web platform behaviors, placing granular control back into the hands of the engineer. Concurrently, React 19 has introduced the necessary primitives—Actions, useActionState, and useOptimistic—to make interactivity in a server-driven world fluid and robust.
This report will dissect these changes across seven core domains:
The Asynchronous Rendering Model: The shift to async Request APIs and its implications for Partial Prerendering (PPR).
React 19 Primitives: The abolition of forwardRef, the introduction of the React Compiler, and the new directive strategies.
Data Strategy: The new caching semantics, the use API for promise unwrapping, and URL-driven state management via nuqs.
Mutation and Interactivity: The standardization of Server Actions and robust form handling patterns.
Structural Organization: Feature-based directory structures and the "server-only" boundary enforcement.
The AI-Driven Workflow: The methodology of Context Engineering using .mdc files.
The Cursor Rules Deliverable: A codified set of instructions to enforce these practices automatically.
2. The Asynchronous Core: Next.js 15 Architecture
The most profound structural change in Next.js 15 is the fundamental alteration of how request-specific data is accessed. In previous iterations, accessing URL parameters, search parameters, or headers was a synchronous operation. This convenience, derived from older server-side rendering (SSR) models, masked the inherent asynchrony of the modern web server's request-response cycle and hindered advanced optimizations like Partial Prerendering.
2.1 The Transition to Async Request APIs
In Next.js 15, APIs that rely on runtime request data—specifically params, searchParams, headers(), cookies(), and draftMode()—have transitioned to being asynchronous. This is a breaking change that necessitates a paradigm shift in component composition.
2.1.1 The Theoretical Imperative
The move to async APIs is driven by the need to decouple static rendering from dynamic data requirements. In a synchronous model, if a component needs params.slug, the entire rendering process for that route segment must wait until the request is fully resolved. By forcing developers to await these properties, Next.js can effectively pause the execution of the dynamic components while allowing the static shell of the application to be generated and potentially streamed to the client immediately.
This architecture paves the way for Partial Prerendering (PPR), where the static parts of a route are pre-generated at build time, and the dynamic parts (dependent on await params) are streamed in at request time. This reduces the Time to First Byte (TTFB) and improves the First Contentful Paint (FCP) metrics significantly.
2.1.2 The await Pattern in Server Components
The immediate implication for developers is the deprecation of direct property access on params and searchParams. The framework now issues warnings in development and will fail builds in future versions if these promises are not awaited.
Legacy Synchronous Access (Deprecated):

TypeScript


// Next.js 14 Pattern
interface Props {
  params: { slug: string };
  searchParams: { [key: string]: string | string | undefined };
}

export default function Page({ params, searchParams }: Props) {
  // ⚠️ WARNING: Synchronous access triggers console errors in v15
  const slug = params.slug; 
  const query = searchParams.q;
  
  return <div>Topic: {slug}</div>;
}


Modern Asynchronous Access (Best Practice):

TypeScript


// Next.js 15 Pattern
interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string | undefined }>;
}

export default async function Page({ params, searchParams }: Props) {
  // Parallel execution using Promise.all is recommended if both are needed
  const [{ slug }, { q }] = await Promise.all([params, searchParams]);
  
  return <div>Topic: {slug}, Query: {q}</div>;
}


This pattern extends beyond just Page components. It is equally applicable to layout.tsx, route.ts (Route Handlers), and crucially, the generateMetadata function.
Impact on Metadata Generation:
The generateMetadata function often requires access to route parameters to fetch SEO-relevant data. This function is now async by default, and params must be awaited within it.

TypeScript


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  
  return {
    title: product.title,
    openGraph: {
      images: [product.coverImage],
    },
  };
}


2.2 Bridging the Gap: The React.use() API
While Server Components can leverage async/await syntax natively, Client Components cannot be async functions. This creates a friction point when passing promises (like params) from a Server Component down to a Client Component. React 19 introduces the use API to resolve this.
The use API is a new hook-like primitive that can read the value of a resource, such as a Promise or a Context. Unlike standard hooks, use can be called conditionally, though it is still generally best practice to call it at the top level for clarity.
2.2.1 Unwrapping Promises in Client Components
When migrating a codebase to Next.js 15, refactoring every component to be async is not always feasible, especially for leaf components that are already marked 'use client'.
The use Pattern:

TypeScript


'use client';

import { use } from 'react';

// The prop is typed as a Promise
export default function SearchBar({ searchParams }: { searchParams: Promise<{ q: string }> }) {
  // The `use` API suspends the component until the promise resolves
  const { q } = use(searchParams);

  return <input defaultValue={q} />;
}


Mechanism: When use(promise) is called, if the promise is pending, React throws the promise, which is caught by the nearest Suspense boundary (or the streaming infrastructure). Once resolved, React re-renders the component with the value. This integrates seamlessly with Next.js's streaming HTML capabilities, ensuring that the client component hydrates with the correct data without causing hydration mismatches.
2.3 Turbopack: The Engine of 2025
Next.js 15 marks the stabilization of Turbopack for development (next dev --turbo). After years of development, the Rust-based successor to Webpack is now ready for prime time.
Performance Implications:
Research indicates significant performance gains with Turbopack enabled:
Startup Time: Up to 76.7% faster local server startup compared to Webpack.
Code Updates: Up to 96.3% faster Fast Refresh, enabling near-instant feedback loops.
Initial Route Compile: Up to 45.8% faster without caching.
Architectural Note: Turbopack does not yet have persistent disk caching (unlike Webpack's filesystem cache), but its in-memory incremental compilation is so efficient that it outperforms Webpack's cached builds in most scenarios. For large monorepos, this speed difference changes the development workflow from "context switching while waiting" to "continuous flow."
Build Performance:
While next build --turbopack is in beta (as of v15.5), it demonstrates 100% integration test compatibility. The recommendation for 2025 is to use --turbo for all local development and begin testing it in CI pipelines for production builds to future-proof the infrastructure.
3. React 19: The New Primitives
Next.js 15 relies on React 19, which introduces several "quality of life" improvements that remove long-standing boilerplate and technical debt from the React ecosystem.
3.1 The React Compiler (Experimental but Essential)
The React Compiler represents the biggest shift in React's mental model since hooks. Historically, developers had to manually optimize render performance using useMemo, useCallback, and React.memo. This manual memoization was error-prone and often led to "dependency array hell."
How It Works:
The compiler automatically memoizes components and hooks. It understands the data flow of the JavaScript and determines exactly which values need to be recalculated when state changes.
Action Item: In React 19/Next.js 15 projects, usage of useMemo and useCallback should be considered a "code smell" unless interacting with external libraries that rely on referential equality.
Enablement: In Next.js 15, the compiler is enabled via next.config.js:
JavaScript
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
};


3.2 Ref as a Prop & Context Changes
React 19 simplifies component APIs by treating ref as a regular prop.
Deprecation: forwardRef is no longer necessary for function components.
New Pattern:
TypeScript
function MyInput({ placeholder, ref }: { placeholder: string, ref: React.Ref<HTMLInputElement> }) {
  return <input placeholder={placeholder} ref={ref} />;
}

This change reduces the wrapper hell and TypeScript complexity often associated with Higher-Order Components (HOCs) wrapping refs.
Similarly, <Context.Provider> is deprecated in favor of just <Context>.

TypeScript


const ThemeContext = createContext('light');

function App() {
  return (
    <ThemeContext value="dark">
      <Page />
    </ThemeContext>
  );
}


3.3 Enhanced Error Reporting
Hydration errors have historically been the bane of Next.js developers. React 19 improves the developer experience by providing a diff-like view of the hydration mismatch. Instead of a generic "Text content does not match server-rendered HTML" error, the console now outputs the specific DOM nodes involved and the differing values. This significantly accelerates debugging issues related to timezone dates, random numbers, or browser-extensions modifying the DOM.
4. Data Strategy: Caching and State Management
Next.js 15 introduces a "caching reset," moving away from aggressive default caching to a more predictable, explicitly opted-in caching model. This section analyzes the strategic implications of this shift.
4.1 The "Uncached by Default" Philosophy
In Next.js 14, fetch requests were cached by default (force-cache). While this produced impressive benchmark scores, it often led to developer confusion where stale data persisted across deployments or logic updates. The framework prioritized "fast but potentially wrong" over "fresh but potentially slow." Next.js 15 inverts this.
The New Defaults:
fetch requests: Default to no-store (uncached).
GET Route Handlers: Default to uncached.
Client Navigations: Default to uncached (Router Cache usually has a stale time of 0s for dynamic pages).
Strategic Analysis:
This shift acknowledges that stale data is a critical failure in modern applications (e.g., showing an incorrect bank balance or inventory count), whereas slow data is a performance optimization problem. It is safer to show fresh data slowly than instant stale data. Furthermore, with the rise of efficient databases (like Neon, Turso) and edge caching (Vercel KV), the penalty for fetching fresh data is lower than it was when static site generation (SSG) was conceived.
4.2 Configuring the Cache
Despite the default change, caching remains a powerful tool. The architecture is multi-layered:
4.2.1 Request Memoization (The Deduplication Layer)
This is an automatic React feature that persists for the duration of a single request lifecycle. If fetchUser() is called in the Layout, the Page, and a Component, the actual network request only happens once. This allows for clean code architecture where components fetch their own data without worrying about performance penalties.
4.2.2 The Data Cache (The Persistence Layer)
To persist data across requests (and deployments), developers must now explicitly opt-in.

TypeScript


// Explicit caching for static CMS content
const posts = await fetch('https://api.cms.com/posts', {
  cache: 'force-cache',
  next: { tags: ['posts'] } // Enable on-demand revalidation
});


This explicit opt-in makes the codebase self-documenting. Any cached request is clearly marked, signaling to future maintainers that stale data is acceptable here.
4.3 State Management: The Rise of URL State (nuqs)
A prevailing best practice in the 2025 App Router architecture is the abandonment of useState, Redux, or Context for distinct application states that should be shareable (filters, pagination, sorting, active tabs). Instead, the URL is the single source of truth.
The library nuqs (Next.js URL Query States) has emerged as the standard for this pattern. It provides a type-safe hook that syncs local state with URL search parameters.
Why nuqs is Superior to useState:
Shareability: Users can copy-paste the URL and share the exact application state (e.g., "Page 3 of Red Shoes sorted by Price").
Server Compatibility: It parses search params on the server and hydrates the client hook with the correct initial value, preventing the dreaded hydration mismatch where the server renders the default state and the client snaps to the URL state.
Type Safety: It uses a Zod-like schema definition to validate URL parameters. If a user manually types ?page=hello, nuqs handles the fallback gracefully rather than crashing the component.
Implementation Pattern:

TypeScript


'use client';
import { useQueryState, parseAsInteger } from 'nuqs';

export function Pagination() {
  // Two-way binding: modifying `page` updates the URL
  const [page, setPage] = useQueryState(
    'page', 
    parseAsInteger.withDefault(1).withOptions({ history: 'push' })
  );

  return (
    <button onClick={() => setPage(p => p + 1)}>
      Next Page ({page + 1})
    </button>
  );
}


4.4 Global State vs. Server State
For data that is not URL-serializable (like complex user sessions or large datasets), the community has moved away from global client stores towards Server State management (using libraries like TanStack Query, though less necessary with RSC) or simple React Context for UI-only state (like Sidebar open/close).
The Rule: If the data originates from the database, it belongs in the Server Component tree or the URL Cache. If the data is purely transient UI state (is the dropdown open?), use useState or Context.
5. Mutation and Interactivity: The Era of Server Actions
React 19 and Next.js 15 solidify Server Actions as the primary mechanism for data mutation, effectively replacing API routes (pages/api or app/api) for internal application logic.
5.1 Standardization of Server Actions
Server Actions are asynchronous functions that execute on the server but can be invoked from Client Components. They eliminates the need to manually create an API endpoint, serialize the request body, handle fetch errors, and deserialize the response.
Security Implications:
Since Server Actions are public endpoints (Next.js creates a unique URL hash for each action), they must be treated with the same security rigor as REST APIs.
Authentication: Every action must verify the current user.
Authorization: Every action must verify permissions.
Validation: Every action must validate input schemas.
5.2 React 19 Form Hooks
React 19 introduces first-class hooks for handling the lifecycle of a Server Action within a form.
5.2.1 useActionState (The Mutation Manager)
Formerly known as useFormState in Canary versions, useActionState is the standard for form handling. It manages the execution of a Server Action, tracking its result (success payload or validation errors) and its pending status.
Architectural Pattern:
The Action: Returns a specific ActionState type.
The Hook: Binds the action to the component state.
The UI: Renders based on state.message or state.errors.

TypeScript


// definition
type ActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
  inputs?: any; // Return inputs to preserve form data on error
}


5.2.2 useOptimistic (The UX Enhancer)
For immediate user feedback, useOptimistic allows the UI to update before the server responds. This is crucial for "app-like" responsiveness.
Deep Dive Scenario: Consider a "Like" button.
Current State: 42 likes.
User Clicks: useOptimistic immediately switches UI to 43 likes (filled heart).
Server Action: Runs in background.
Success: UI remains at 43 (official state).
Failure: UI reverts to 42, and a toast error is shown.
This pattern, previously requiring complex customized reducers, is now a native primitive.
5.3 Validation with Zod
Integration with Zod is the industry standard for validating Server Actions.
The "Safe Action" Pattern:
A best practice emerging in 2025 is to use a higher-order function or a standard pattern to wrap actions. This wrapper handles:
try/catch logic for unhandled exceptions.
Zod schema validation.
Auth checks.

TypeScript


import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
});

export async function subscribe(prevState: any, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  
  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation Error',
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  // Logic...
  return { success: true, message: 'Subscribed!' };
}


6. Structural Organization: Feature-Based Architecture
As Next.js applications scale, the default file-system routing can lead to a scattered codebase where components, styles, and logic for a single feature are separated by distinct folder hierarchies. The 2025 best practice leverages Feature-Based Architecture using Route Groups and Colocation.
6.1 The src Directory
Usage of the src directory is now the de facto standard. It separates application code (src/app, src/components) from project configuration files (next.config.ts, tailwind.config.ts, .eslintrc.json) at the root. This improves tooling discovery and keeps the root clean.
6.2 Route Groups and Feature Isolation
Next.js allows folders wrapped in parentheses (folderName) to be omitted from the URL path. This feature is exploited to group routes by business domain rather than just URL structure.
Recommended Structure:
src/
├── app/
│ ├── (marketing)/ # Marketing specific layouts/pages
│ │ ├── page.tsx # Landing page (/)
│ │ └── about/ # About page (/about)
│ ├── (auth)/ # Authentication routes
│ │ ├── login/
│ │ └── register/
│ ├── (dashboard)/ # Main App (requires auth layout)
│ │ ├── layout.tsx # Dashboard Sidebar/Shell
│ │ ├── dashboard/
│ │ │ ├── page.tsx
│ │ │ └── _components/ # PRIVATE components for dashboard
│ │ └── settings/
│ │ ├── page.tsx
│ │ └── _lib/ # PRIVATE utils for settings
│ └── api/ # Route Handlers (Webhooks, etc.)
6.3 The Power of Colocation (_folders)
Next.js supports private folders prefixed with an underscore (e.g., _components). These folders are excluded from routing.
Best Practice: Colocate components, hooks, and utils as close as possible to where they are used.
Scenario: If ProfileCard.tsx is only used in the /settings page, it should live in src/app/(dashboard)/settings/_components/ProfileCard.tsx.
Benefit: When you delete the route, you delete all its dependencies automatically. Codebase hygiene is maintained naturally.
Shared: Only truly shared components (Buttons, Inputs, Dialogs) belong in src/components/ui.
6.4 The "Server-Only" Boundary
To prevent sensitive server code (database queries, API keys) from accidentally leaking into client bundles, the server-only package is mandatory for all data access layers.
Implementation:
Create a file src/lib/db.ts:

TypeScript


import 'server-only'; // This line ensures build failure if imported by Client Component
import { createPool } from 'pg';

export const db = createPool(...);


This simple import acts as a firewall within the module system, enforcing architectural boundaries at build time.
7. Styling and Assets: Tailwind v4 and Optimization
7.1 Tailwind CSS v4: The Engine Rewrite
2025 sees the adoption of Tailwind CSS v4. The framework has moved to a "CSS-first" configuration approach, utilizing the native capabilities of modern CSS engines.
Changes:
No tailwind.config.js: Configuration is handled via CSS variables in the main CSS file using the @theme directive.
Performance: The new engine is built in Rust and is up to 10x faster for incremental builds.
Automatic Detection: v4 automatically scans content files for class names without needing a content array configuration.
globals.css Example:

CSS


@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --font-sans: "Geist Sans", sans-serif;
  --spacing-container: 1280px;
}


7.2 Image Optimization
Next.js 15 simplifies image optimization self-hosting. Previously, developers had to manually install sharp. Now, sharp is automatically utilized if present, or Next.js manages the optimization pipeline more gracefully in standalone mode.
Best Practice: Always use the <Image> component. For images with unknown dimensions (CMS content), use the fill prop coupled with a parent container that has position: relative and a defined aspect ratio.
7.3 Font Optimization with next/font
Cumulative Layout Shift (CLS) is a major SEO ranking factor. next/font eliminates CLS by using the CSS size-adjust property to create a fallback font that exactly matches the metrics of the web font while it loads.
Google Fonts Strategy:
Using next/font/google downloads the font at build time and self-hosts it. No requests are sent to Google servers by the user's browser, improving privacy (GDPR compliance) and performance (no DNS lookup).
8. The AI-Driven Workflow: Context Engineering
In the modern development lifecycle, the IDE is no longer a passive text editor but an active collaborator powered by Large Language Models (LLMs). Configuring this collaborator is as critical as configuring the linter.
8.1 The .mdc Standard
While .cursorrules (a plain text file at root) provides global instructions, the emerging standard for Cursor is the use of .mdc (Markdown for Context) files located in .cursor/rules/.
Why .mdc?
Modularity: Instead of a 2000-line prompt that confuses the context window, rules are broken down by domain (react.mdc, testing.mdc, styles.mdc).
Scoping (Globs): Each .mdc file has frontmatter defining which files it applies to. The "Server Actions" rule only activates when the AI is editing a file matching **/actions.ts.
Context Engineering: This allows us to inject specific architectural decisions (like "Use nuqs for state") exactly when relevant, ensuring high compliance from the AI.
8.2 The Psychology of Rules
Effective rules do not just describe the goal; they constrain the solution space.
Bad Rule: "Write good code."
Good Rule: "Do not use useEffect for data fetching. Use Server Components. If interaction is needed, use Event Handlers."
Gold Standards: Providing a "Gold Standard" code snippet in the rule helps the LLM align its output style (indentation, naming conventions, import ordering) with the project norms.
9. Comprehensive Cursor Rules Deliverable
The following section constitutes the core artifact of this report: a comprehensive set of rules derived from the research above, formatted for direct implementation in a .cursor/rules/ directory.
9.1 Global Core Rules (.cursor/rules/global.mdc)
description: Global architectural standards for Next.js 15 and React 19 globs: ["/*.tsx", "/.ts", "**/.js"]
Core Architectural Principles
Server Components First (RSC)
Default: All components are Server Components.
Exception: Add 'use client' ONLY when:
Using event listeners (onClick, onChange, onSubmit).
Using React Hooks (useState, useEffect, useRef).
Using browser-only APIs (window, localStorage, navigator).
Boundary: Push the Client Component boundary as far down the tree as possible. Layouts and Pages should almost always be Server Components.
Asynchronous Data Access (Next.js 15)
Rule: ALWAYS await params and searchParams in Pages, Layouts, Route Handlers, and Metadata generation.
Restriction: NEVER access params.slug or searchParams.q synchronously.
**Pattern:**typescript
// Correct
const { slug } = await params;
// Incorrect
const slug = params.slug;


Data Fetching Strategy
Default: Fetch requests are no-store (uncached) by default in Next.js 15.
Optimization: Use cache: 'force-cache' explicitly for static/CMS data.
Security: ALWAYS import server-only in data fetching utilities/services to prevent client-side leakage.
Restriction: DO NOT use useEffect to fetch data. Use async Server Components.
State Management
UI State: Use useState or useReducer for transient state (modals, dropdowns).
URL State: Use nuqs (Next.js URL Query States) for shareable state (filters, pagination, sorting).
Server State: Rely on RSC freshness; avoid extensive client-side stores like Redux unless building a rich local-first app (e.g., image editor).
Styling (Tailwind v4)
Method: Use standard utility classes.
Dynamic: Use clsx or tailwind-merge (via cn() utility) for conditional classes.
Restriction: Avoid style={{}} prop unless strictly necessary for dynamic coordinate values.



### 9.2 Server Actions & Mutations (`.cursor/rules/actions.mdc`)

---
description: Standards for Server Actions, Form Handling, and Validation
globs: ["src/**/actions.ts", "src/**/actions.tsx"]
---
# Server Action Standards

1.  **File Structure**
    *   Actions must be defined in separate files (e.g., `actions.ts`) with `'use server'` at the top.
    *   Do not inline server actions inside Client Components.

2.  **Validation (Zod)**
    *   **Requirement:** ALL inputs must be validated using `zod` schemas.
    *   **Pattern:** Use `schema.safeParse()`. Do not use `parse()` which throws errors.
    *   **Return Type:** Actions must return a standardized State object:typescript
        export type ActionState = {
          success: boolean;
          message: string;
          errors?: Record<string, string>;
          inputs?: any;
        };
        ```

3.  **React 19 Integration**
    *   **Consumption:** Use `useActionState` (NOT `useFormState`) in Client Components to consume actions.
    *   **Feedback:** Use `useOptimistic` for immediate UI updates on mutation.
    *   **Status:** Use `useFormStatus` (or the `isPending` from `useActionState`) to disable submit buttons.

4.  **Error Handling**
    *   **Expected Errors:** Validation failures or business logic rejections should return `{ success: false, message:... }`.
    *   **Unexpected Errors:** Database connection failures should be caught, logged, and a generic error message returned.
    *   **Redirects:** `redirect()` and `notFound()` should be called OUTSIDE `try/catch` blocks (or re-thrown) as they work by throwing special errors.


9.3 React 19 & Components (.cursor/rules/react.mdc)
description: React 19 specific coding patterns and component guidelines globs: ["**/*.tsx"]
React 19 Component Patterns
Compiler Optimization
Rule: Do NOT use useMemo or useCallback unless strictly necessary for referential equality in external libraries. Trust the React Compiler.
Ref: Do NOT use forwardRef. Accept ref as a standard prop.
Context: Use <Context> provider instead of <Context.Provider>.
Promise Handling in Client
Rule: If a Client Component receives a Promise prop (e.g., searchParams), use the use() API to unwrap it.
**Pattern:**typescript
'use client';
import { use } from 'react';
export default function ClientComp({ dataPromise }: { dataPromise: Promise }) {
const data = use(dataPromise); // Suspends here
return {data};
}


Hydration & SEO
Metadata: Use generateMetadata (async) for dynamic SEO tags. Await params inside it.
Images: Use next/image for all bitmaps. Define alt text explicitly.
Fonts: Use next/font to prevent Cumulative Layout Shift (CLS).



### 9.4 Project Structure (`.cursor/rules/structure.mdc`)

---
description: File system organization and strict naming conventions
globs: ["src/**/*"]
---
# Directory Organization

1.  **Feature-Based Routing**
    *   Use Route Groups `(groupName)` to organize logical domains (e.g., `(marketing)`, `(auth)`, `(dashboard)`).
    *   **Colocation:** Place components, hooks, and utils used ONLY by a specific feature inside a `_components` or `_lib` folder within that route segment.

2.  **Shared Resources**
    *   `src/components/ui`: Primitive UI elements (Shadcn UI components).
    *   `src/components/layout`: Global layout elements (Nav, Footer).
    *   `src/lib`: Singleton utilities (DB client, Auth client).

3.  **Naming Conventions**
    *   **Files:** `kebab-case` for directories and route files (`page.tsx`, `loading.tsx`).
    *   **Components:** `PascalCase` for component files (`SubmitButton.tsx`).
    *   **Hooks:** `camelCase` starting with `use` (`useScroll.ts`).
    *   **Server Actions:** `camelCase` verbs (`createUser`, `updateProfile`).

4.  **Exports**
    *   Use Named Exports for components (`export function Button...`).
    *   Avoid `default` exports except for Next.js special files (`page.tsx`, `layout.tsx`, `route.ts`).

---

## 10. Conclusion and Migration Path

The convergence of Next.js 15 and React 19 provides a powerful, if strict, framework for building scalable web applications. The "Uncached by Default" and "Async Request" models require a higher degree of intentionality from developers, eliminating the "magic" that often led to debugging nightmares in previous versions.

For teams adopting these technologies in 2025, the path forward involves:
1.  **Audit:** Scanning codebase for synchronous `params` access.
2.  **Configure:** Setting up `.cursorrules` to enforce the new mental model.
3.  **Refactor:** Moving from `useState` to `nuqs` for URL-driven state and adopting `zod`-validated Server Actions.

By codifying these practices into the development environment itself via Cursor, teams can ensure that the rapid pace of AI code generation aligns with the rigid architectural requirements of the Next.js 15 / React 19 stack, resulting in software that is performant, maintainable, and robust.

---

### Appendix: Version Compatibility Matrix

| Feature | Next.js 14 | Next.js 15 |
| :--- | :--- | :--- |
| **Request Params** | Synchronous | Asynchronous (Breaking) |
| **Fetch Default** | `force-cache` | `no-store` (Breaking) |
| **React Core** | v18 | v19 |
| **Form Hook** | `useFormState` | `useActionState` |
| **Compiler** | None | React Compiler (Experimental) |
| **Dev Engine** | Webpack | Turbopack (Stable) |

**References:** [1] Next.js 15 Release Notes[2] React 19 Features[3] Sync Dynamic APIs Warning[4] Fetch Caching Defaults[5] Tailwind v4 Announcement[6] Nuqs Library Documentation.
