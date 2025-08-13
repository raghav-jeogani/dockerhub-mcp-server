import { z } from 'zod';

// DockerHub API Response Types
export const DockerHubImageSchema = z.object({
  id: z.number(),
  name: z.string(),
  namespace: z.string(),
  repository_type: z.string(),
  status: z.number(),
  description: z.string().optional(),
  is_private: z.boolean(),
  is_automated: z.boolean(),
  can_edit: z.boolean(),
  star_count: z.number(),
  pull_count: z.number(),
  last_updated: z.string(),
  date_registered: z.string(),
  collaborator_count: z.number(),
  hub_user: z.string(),
  has_starred: z.boolean(),
  full_description: z.string().optional(),
  affiliation: z.string().optional(),
  permissions: z.object({
    read: z.boolean(),
    write: z.boolean(),
    admin: z.boolean(),
  }),
});

export const DockerHubTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  last_updated: z.string(),
  digest: z.string().optional(),
  size: z.number().optional(),
  architecture: z.string().optional(),
  os: z.string().optional(),
  variant: z.string().optional(),
  features: z.array(z.string()).optional(),
  os_version: z.string().optional(),
  os_features: z.array(z.string()).optional(),
  note: z.string().optional(),
});

export const DockerHubManifestSchema = z.object({
  schemaVersion: z.number(),
  name: z.string(),
  tag: z.string(),
  architecture: z.string(),
  fsLayers: z.array(z.object({
    blobSum: z.string(),
    size: z.number().optional(),
  })),
  history: z.array(z.object({
    v1Compatibility: z.string(),
  })),
  signatures: z.array(z.object({
    header: z.object({
      jwk: z.object({
        crv: z.string(),
        kid: z.string(),
        kty: z.string(),
        x: z.string(),
        y: z.string(),
      }),
      alg: z.string(),
    }),
    signature: z.string(),
    protected: z.string(),
  })),
  dockerHubData: z.object({
    totalSize: z.number(),
    variantCount: z.number(),
    architectures: z.array(z.string()),
    operatingSystems: z.array(z.string()),
    lastUpdated: z.string(),
    digest: z.string().optional(),
  }).optional(),
});

export const DockerHubVulnerabilitySchema = z.object({
  id: z.string(),
  status: z.string(),
  description: z.string(),
  severity: z.string(),
  package: z.string(),
  version: z.string(),
  fixed_version: z.string().optional(),
  cve_id: z.string().optional(),
  cvss_score: z.number().optional(),
});

export const DockerHubStatsSchema = z.object({
  pull_count: z.number(),
  star_count: z.number(),
  last_updated: z.string(),
  tags_count: z.number(),
});

// MCP Tool Input/Output Schemas
export const SearchImagesInputSchema = z.object({
  query: z.string().describe("Search query for Docker images"),
  limit: z.number().min(1).max(100).default(25).describe("Maximum number of results to return"),
  page: z.number().min(1).default(1).describe("Page number for pagination"),
  is_official: z.boolean().optional().describe("Filter for official images only"),
  is_automated: z.boolean().optional().describe("Filter for automated builds only"),
});

export const GetImageDetailsInputSchema = z.object({
  repository: z.string().describe("Repository name (e.g., 'library/nginx')"),
  tag: z.string().default("latest").describe("Image tag to fetch details for"),
});

export const ListTagsInputSchema = z.object({
  repository: z.string().describe("Repository name (e.g., 'library/nginx')"),
  limit: z.number().min(1).max(100).default(25).describe("Maximum number of tags to return"),
  page: z.number().min(1).default(1).describe("Page number for pagination"),
});

export const CompareImagesInputSchema = z.object({
  image1: z.string().describe("First image (format: repository:tag)"),
  image2: z.string().describe("Second image (format: repository:tag)"),
});

export const GetVulnerabilitiesInputSchema = z.object({
  repository: z.string().describe("Repository name"),
  tag: z.string().default("latest").describe("Image tag"),
  severity: z.enum(["low", "medium", "high", "critical"]).optional().describe("Filter by severity level"),
});

// Type exports
export type DockerHubImage = z.infer<typeof DockerHubImageSchema>;
export type DockerHubTag = z.infer<typeof DockerHubTagSchema>;
export type DockerHubManifest = z.infer<typeof DockerHubManifestSchema>;
export type DockerHubVulnerability = z.infer<typeof DockerHubVulnerabilitySchema>;
export type DockerHubStats = z.infer<typeof DockerHubStatsSchema>;

export type SearchImagesInput = z.infer<typeof SearchImagesInputSchema>;
export type GetImageDetailsInput = z.infer<typeof GetImageDetailsInputSchema>;
export type ListTagsInput = z.infer<typeof ListTagsInputSchema>;
export type CompareImagesInput = z.infer<typeof CompareImagesInputSchema>;
export type GetVulnerabilitiesInput = z.infer<typeof GetVulnerabilitiesInputSchema>;

// Registry configuration
export interface RegistryConfig {
  name: string;
  url: string;
  username?: string;
  password?: string;
  token?: string;
  isDefault?: boolean;
}

// Cache configuration
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  checkPeriod: number; // Check period in seconds
  maxKeys: number; // Maximum number of keys in cache
}

// Rate limiting configuration
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstSize: number;
}

// Application configuration
export interface AppConfig {
  registries: RegistryConfig[];
  cache: CacheConfig;
  rateLimit: RateLimitConfig;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
} 