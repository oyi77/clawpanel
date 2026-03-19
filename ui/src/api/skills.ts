import { api } from "./client";

export interface SkillMissing {
  bins?: string[];
  env?: string[];
  config?: string[];
}

export interface SkillInstallOption {
  kind: string;
  label: string;
  [key: string]: unknown;
}

export interface Skill {
  name: string;
  description?: string;
  emoji?: string;
  source?: string;
  bundled?: boolean;
  homepage?: string;
  filePath?: string;
  eligible?: boolean;
  disabled?: boolean;
  blockedByAllowlist?: boolean;
  missing?: SkillMissing;
  install?: SkillInstallOption[];
  requirements?: { bins?: string[]; env?: string[] };
}

export interface SkillsListResponse {
  skills: Skill[];
  cliAvailable: boolean;
}

export interface SkillHubCheckResult {
  installed: boolean;
  version?: string;
}

export interface StoreSkill {
  slug?: string;
  name?: string;
  description?: string;
  summary?: string;
}

export const skillsApi = {
  list: () => api.get<SkillsListResponse>("/skills"),

  info: (name: string) =>
    api.get<Skill>(`/skills/${encodeURIComponent(name)}`),

  installDep: (kind: string, spec: SkillInstallOption) => {
    const { kind: _omit, ...rest } = spec;
    return api.post<{ ok: true }>("/skills/install-dep", { kind, ...rest });
  },

  uninstall: (name: string) =>
    api.delete<{ ok: true }>(`/skills/${encodeURIComponent(name)}`),

  skillHubCheck: () => api.get<SkillHubCheckResult>("/skills/skillhub/check"),

  skillHubSetup: () => api.post<{ ok: true }>("/skills/skillhub/setup", {}),

  skillHubSearch: (query: string) =>
    api.get<StoreSkill[]>(
      `/skills/skillhub/search?q=${encodeURIComponent(query)}`,
    ),

  skillHubInstall: (slug: string) =>
    api.post<{ ok: true }>("/skills/skillhub/install", { slug }),

  clawHubSearch: (query: string) =>
    api.get<StoreSkill[]>(
      `/skills/clawhub/search?q=${encodeURIComponent(query)}`,
    ),

  clawHubInstall: (slug: string) =>
    api.post<{ ok: true }>("/skills/clawhub/install", { slug }),
};
