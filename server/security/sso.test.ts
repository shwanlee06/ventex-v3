import { describe, it, expect } from "vitest";
import {
  generateSPMetadata,
  generateAuthnRequest,
  parseAndValidateSAMLResponse,
  generateSCIMToken,
  type SAMLConfig,
} from "./sso";

describe("SSO — SAML 2.0", () => {
  const baseUrl = "https://app.ventex.ai";
  const orgSlug = "acme-capital";

  it("generates valid SP metadata XML", () => {
    const xml = generateSPMetadata(orgSlug, baseUrl);
    expect(xml).toContain("EntityDescriptor");
    expect(xml).toContain(`entityID="${baseUrl}/api/sso/saml/${orgSlug}/metadata"`);
    expect(xml).toContain(`Location="${baseUrl}/api/sso/saml/${orgSlug}/acs"`);
    expect(xml).toContain("SPSSODescriptor");
    expect(xml).toContain("AssertionConsumerService");
    expect(xml).toContain("SingleLogoutService");
    expect(xml).toContain("urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress");
  });

  it("generates SAML AuthnRequest with redirect URL", () => {
    const config: SAMLConfig = {
      organizationId: 1,
      idpEntityId: "https://idp.example.com",
      idpSsoUrl: "https://idp.example.com/sso",
      idpCertificate: "CERT",
      spEntityId: `${baseUrl}/api/sso/saml/${orgSlug}/metadata`,
      spAcsUrl: `${baseUrl}/api/sso/saml/${orgSlug}/acs`,
      nameIdFormat: "email",
    };

    const { redirectUrl, requestId } = generateAuthnRequest(config);
    expect(requestId).toMatch(/^_[0-9a-f-]+$/);
    expect(redirectUrl).toContain("https://idp.example.com/sso?SAMLRequest=");
    expect(redirectUrl).toContain("RelayState=");
  });

  it("parses a valid SAML response", () => {
    const samlXml = `
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">https://idp.example.com</saml:Issuer>
  <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">john@acme.com</saml:NameID>
    </saml:Subject>
    <saml:AttributeStatement>
      <saml:Attribute Name="firstName"><saml:AttributeValue>John</saml:AttributeValue></saml:Attribute>
      <saml:Attribute Name="lastName"><saml:AttributeValue>Doe</saml:AttributeValue></saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;

    const encoded = Buffer.from(samlXml).toString("base64");
    const config: SAMLConfig = {
      organizationId: 1,
      idpEntityId: "https://idp.example.com",
      idpSsoUrl: "https://idp.example.com/sso",
      idpCertificate: "",
      spEntityId: "sp",
      spAcsUrl: "acs",
      nameIdFormat: "email",
    };

    const assertion = parseAndValidateSAMLResponse(encoded, config);
    expect(assertion).not.toBeNull();
    expect(assertion!.nameId).toBe("john@acme.com");
    expect(assertion!.attributes.firstName).toBe("John");
    expect(assertion!.attributes.lastName).toBe("Doe");
    expect(assertion!.issuer).toBe("https://idp.example.com");
  });

  it("returns null for invalid SAML response", () => {
    const encoded = Buffer.from("not xml").toString("base64");
    const config: SAMLConfig = {
      organizationId: 1,
      idpEntityId: "",
      idpSsoUrl: "",
      idpCertificate: "",
      spEntityId: "",
      spAcsUrl: "",
      nameIdFormat: "email",
    };

    const assertion = parseAndValidateSAMLResponse(encoded, config);
    expect(assertion).toBeNull();
  });

  it("returns null for SAML response without NameID", () => {
    const samlXml = `<samlp:Response><saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"><saml:Subject></saml:Subject></saml:Assertion></samlp:Response>`;
    const encoded = Buffer.from(samlXml).toString("base64");
    const config: SAMLConfig = {
      organizationId: 1,
      idpEntityId: "",
      idpSsoUrl: "",
      idpCertificate: "",
      spEntityId: "",
      spAcsUrl: "",
      nameIdFormat: "email",
    };

    const assertion = parseAndValidateSAMLResponse(encoded, config);
    expect(assertion).toBeNull();
  });
});

describe("SSO — SCIM Token", () => {
  it("generates unique SCIM tokens", () => {
    const token1 = generateSCIMToken();
    const token2 = generateSCIMToken();
    expect(token1).toMatch(/^scim_[0-9a-f]{64}$/);
    expect(token2).toMatch(/^scim_[0-9a-f]{64}$/);
    expect(token1).not.toBe(token2);
  });

  it("generates tokens of correct length", () => {
    const token = generateSCIMToken();
    // "scim_" (5) + 64 hex chars = 69
    expect(token.length).toBe(69);
  });
});

describe("SSO — SP Metadata variations", () => {
  it("handles special characters in org slug", () => {
    const xml = generateSPMetadata("org-with-dashes", "https://ventex.ai");
    expect(xml).toContain("org-with-dashes");
    expect(xml).toContain("https://ventex.ai/api/sso/saml/org-with-dashes/metadata");
  });

  it("includes SLO endpoint", () => {
    const xml = generateSPMetadata("test", "https://ventex.ai");
    expect(xml).toContain("SingleLogoutService");
    expect(xml).toContain("/api/sso/saml/test/slo");
  });

  it("requests signed assertions", () => {
    const xml = generateSPMetadata("test", "https://ventex.ai");
    expect(xml).toContain('WantAssertionsSigned="true"');
    expect(xml).toContain('AuthnRequestsSigned="true"');
  });
});
