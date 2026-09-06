import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "roomly-app/**",
  ]),
  {
    // `requestIdentity` exige um perfil de equipe do coworking. Quem aluga sala
    // se cadastra sem convite e não tem perfil nenhum, então autorizar um
    // cliente por ele responde "Autenticação necessária" para quem está
    // logado. Já aconteceu duas vezes, no cabeçalho e no cancelamento, e nos
    // dois casos nenhum teste pegou porque a suíte roda em modo simulador,
    // onde `requestIdentity` sempre devolve alguém.
    files: ["src/app/**/*.{ts,tsx}"],
    ignores: ["src/app/admin/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/server/identity",
              message:
                "Fora do painel, quem autoriza é requestCustomer ou a própria RPC. requestIdentity é a identidade da equipe do coworking.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
