import { describe, it, expect } from "vitest";
import {
  REGION_CONFIG,
  COMPLIANCE_LABELS,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_COMPLIANCE_CONFIG,
  isFeatureEnabled,
  getAIOutputLabel,
  getDisclaimerPrefix,
  type TenantComplianceConfig,
  type DataResidencyRegion,
} from "./compliance";

describe("WS4 + WS9: Compliance Engine", () => {
  describe("Region Configuration", () => {
    it("should define US, EU, and APAC regions", () => {
      expect(REGION_CONFIG.us).toBeDefined();
      expect(REGION_CONFIG.eu).toBeDefined();
      expect(REGION_CONFIG.apac).toBeDefined();
    });

    it("US region should not require cross-border transfers", () => {
      expect(REGION_CONFIG.us.crossBorderRequired).toBe(false);
    });

    it("EU region should require cross-border transfers for AI", () => {
      expect(REGION_CONFIG.eu.crossBorderRequired).toBe(true);
      expect(REGION_CONFIG.eu.s3Region).toBe("eu-west-1");
    });

    it("APAC region should require cross-border transfers", () => {
      expect(REGION_CONFIG.apac.crossBorderRequired).toBe(true);
      expect(REGION_CONFIG.apac.s3Region).toBe("ap-southeast-1");
    });

    it("all regions should have valid S3 bucket names", () => {
      for (const region of Object.values(REGION_CONFIG)) {
        expect(region.s3Bucket).toMatch(/^ventex-files-/);
        expect(region.s3Region).toBeTruthy();
      }
    });
  });

  describe("Compliance Mode Labels", () => {
    it("technology_vendor_only should label outputs as Operational Suggestion", () => {
      expect(COMPLIANCE_LABELS.technology_vendor_only.aiOutputLabel).toBe("Operational Suggestion");
    });

    it("advisory_enabled should label outputs as Recommendation", () => {
      expect(COMPLIANCE_LABELS.advisory_enabled.aiOutputLabel).toBe("Recommendation");
    });

    it("both modes should have disclaimer prefixes", () => {
      expect(COMPLIANCE_LABELS.technology_vendor_only.disclaimerPrefix).toContain("not investment");
      expect(COMPLIANCE_LABELS.advisory_enabled.disclaimerPrefix).toContain("Consult qualified");
    });
  });

  describe("Default Feature Flags", () => {
    it("money_movement should default to OFF", () => {
      expect(DEFAULT_FEATURE_FLAGS.enables_money_movement).toBe(false);
    });

    it("securities_communications should default to OFF", () => {
      expect(DEFAULT_FEATURE_FLAGS.enables_securities_communications).toBe(false);
    });

    it("AI agents should default to ON", () => {
      expect(DEFAULT_FEATURE_FLAGS.enables_ai_agents).toBe(true);
    });

    it("document intelligence should default to ON", () => {
      expect(DEFAULT_FEATURE_FLAGS.enables_document_intelligence).toBe(true);
    });

    it("distribution tracking should default to ON", () => {
      expect(DEFAULT_FEATURE_FLAGS.enables_distribution_tracking).toBe(true);
    });

    it("client portal should default to ON", () => {
      expect(DEFAULT_FEATURE_FLAGS.enables_client_portal).toBe(true);
    });
  });

  describe("Default Compliance Config", () => {
    it("should default to US data residency", () => {
      expect(DEFAULT_COMPLIANCE_CONFIG.dataResidency).toBe("us");
    });

    it("should default to technology_vendor_only mode", () => {
      expect(DEFAULT_COMPLIANCE_CONFIG.complianceMode).toBe("technology_vendor_only");
    });

    it("should default to no cross-border consent", () => {
      expect(DEFAULT_COMPLIANCE_CONFIG.crossBorderConsentGiven).toBe(false);
      expect(DEFAULT_COMPLIANCE_CONFIG.crossBorderConsentDate).toBeNull();
    });
  });

  describe("isFeatureEnabled", () => {
    const config: TenantComplianceConfig = {
      ...DEFAULT_COMPLIANCE_CONFIG,
      featureFlags: {
        ...DEFAULT_FEATURE_FLAGS,
        enables_money_movement: false,
        enables_ai_agents: true,
      },
    };

    it("should return false for disabled features", () => {
      expect(isFeatureEnabled(config, "enables_money_movement")).toBe(false);
    });

    it("should return true for enabled features", () => {
      expect(isFeatureEnabled(config, "enables_ai_agents")).toBe(true);
    });

    it("should return false for securities_communications by default", () => {
      expect(isFeatureEnabled(config, "enables_securities_communications")).toBe(false);
    });
  });

  describe("getAIOutputLabel", () => {
    it("should return Operational Suggestion for technology_vendor_only", () => {
      const config: TenantComplianceConfig = {
        ...DEFAULT_COMPLIANCE_CONFIG,
        complianceMode: "technology_vendor_only",
      };
      expect(getAIOutputLabel(config)).toBe("Operational Suggestion");
    });

    it("should return Recommendation for advisory_enabled", () => {
      const config: TenantComplianceConfig = {
        ...DEFAULT_COMPLIANCE_CONFIG,
        complianceMode: "advisory_enabled",
      };
      expect(getAIOutputLabel(config)).toBe("Recommendation");
    });
  });

  describe("getDisclaimerPrefix", () => {
    it("should include not investment advice for technology_vendor_only", () => {
      const config: TenantComplianceConfig = {
        ...DEFAULT_COMPLIANCE_CONFIG,
        complianceMode: "technology_vendor_only",
      };
      expect(getDisclaimerPrefix(config)).toContain("not investment");
    });

    it("should include consult advisors for advisory_enabled", () => {
      const config: TenantComplianceConfig = {
        ...DEFAULT_COMPLIANCE_CONFIG,
        complianceMode: "advisory_enabled",
      };
      expect(getDisclaimerPrefix(config)).toContain("Consult qualified");
    });
  });
});
