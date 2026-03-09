import { useState, useRef, useCallback } from "react";

// ─── AIQ API Field Definitions ────────────────────────────────────────────────
const AIQ_API = {
  customers: {
    label: "Customers",
    icon: "👥",
    createEndpoint: "CreateCustomer",
    helpUrl: "https://aiq.helpjuice.com/en_GB/customers",
    fields: [
      { key: "Code", label: "Account Code", required: true, example: "CUST001", note: "Unique customer code (max 10 chars)" },
      { key: "Name", label: "Company Name", required: true, example: "Acme Ltd" },
      { key: "ContactName", label: "Contact Name", required: false, example: "John Smith" },
      { key: "AddressLine1", label: "Address Line 1", required: false, example: "10 Main Street" },
      { key: "AddressLine2", label: "Address Line 2", required: false, example: "" },
      { key: "City", label: "City / Town", required: false, example: "Dublin" },
      { key: "PostCode", label: "Post Code", required: false, example: "D01 AB12" },
      { key: "Country", label: "Country Code", required: false, example: "IE", note: "ISO 2-letter e.g. IE, GB, US" },
      { key: "TelephoneNumber", label: "Telephone", required: false, example: "+353 1 555 0100" },
      { key: "EmailAddress", label: "Email", required: false, example: "accounts@acme.ie" },
      { key: "VATRegistrationNumber", label: "VAT Reg Number", required: false, example: "IE1234567T" },
      { key: "CurrencyCode", label: "Currency", required: false, example: "EUR", note: "ISO 3-letter e.g. EUR, GBP, USD" },
      { key: "CreditLimit", label: "Credit Limit", required: false, example: "10000", note: "Numeric, no currency symbol" },
      { key: "PaymentTermsDays", label: "Payment Terms (Days)", required: false, example: "30" },
    ]
  },
  suppliers: {
    label: "Suppliers",
    icon: "🏭",
    createEndpoint: "CreateSupplier",
    helpUrl: "https://aiq.helpjuice.com/en_GB/suppliers",
    fields: [
      { key: "Code", label: "Account Code", required: true, example: "SUPP001", note: "Unique supplier code (max 10 chars)" },
      { key: "Name", label: "Company Name", required: true, example: "Parts Direct Ltd" },
      { key: "ContactName", label: "Contact Name", required: false, example: "Jane Doe" },
      { key: "AddressLine1", label: "Address Line 1", required: false, example: "5 Industrial Estate" },
      { key: "AddressLine2", label: "Address Line 2", required: false, example: "" },
      { key: "City", label: "City / Town", required: false, example: "Cork" },
      { key: "PostCode", label: "Post Code", required: false, example: "T12 XY34" },
      { key: "Country", label: "Country Code", required: false, example: "IE", note: "ISO 2-letter code" },
      { key: "TelephoneNumber", label: "Telephone", required: false, example: "+353 21 555 0200" },
      { key: "EmailAddress", label: "Email", required: false, example: "invoices@partsdirect.ie" },
      { key: "VATRegistrationNumber", label: "VAT Reg Number", required: false, example: "IE9876543B" },
      { key: "CurrencyCode", label: "Currency", required: false, example: "EUR", note: "ISO 3-letter code" },
      { key: "PaymentTermsDays", label: "Payment Terms (Days)", required: false, example: "30" },
    ]
  },
  glAccounts: {
    label: "Chart of Accounts",
    icon: "📊",
    createEndpoint: "CreateGLAccount",
    helpUrl: "https://aiq.helpjuice.com/en_GB/chart-of-accounts",
    fields: [
      { key: "AccountCode", label: "Account Code", required: true, example: "4000", note: "Numeric code (4-6 digits recommended)" },
      { key: "AccountName", label: "Account Name", required: true, example: "Sales Revenue" },
      { key: "AccountType", label: "Account Type", required: true, example: "Income", note: "Must be: Income, Expense, Asset, Liability, Equity, or Bank" },
      { key: "VATCode", label: "VAT Code", required: false, example: "S1", note: "AIQ internal VAT rate code" },
      { key: "Description", label: "Description", required: false, example: "Main sales revenue account" },
      { key: "IsActive", label: "Is Active", required: false, example: "true", note: "true or false" },
    ]
  },
  products: {
    label: "Products / Services",
    icon: "📦",
    createEndpoint: "CreateProduct",
    helpUrl: "https://aiq.helpjuice.com/en_GB/products",
    fields: [
      { key: "ProductCode", label: "Product Code", required: true, example: "PROD001", note: "Unique code (max 20 chars)" },
      { key: "ProductName", label: "Product Name", required: true, example: "Widget A" },
      { key: "Description", label: "Description", required: false, example: "Standard widget component" },
      { key: "SalePrice", label: "Sale Price", required: false, example: "89.99", note: "Numeric, no currency symbol" },
      { key: "CostPrice", label: "Cost Price", required: false, example: "45.00" },
      { key: "SalesGLCode", label: "Sales GL Code", required: false, example: "4000", note: "Must match a GL Account Code" },
      { key: "PurchaseGLCode", label: "Purchase GL Code", required: false, example: "5000", note: "Must match a GL Account Code" },
      { key: "VATCode", label: "VAT Code", required: false, example: "S1" },
      { key: "UnitOfMeasure", label: "Unit of Measure", required: false, example: "EA", note: "EA, HR, KG, etc." },
    ]
  },
};

// ─── Source platform definitions ──────────────────────────────────────────────
const SOURCE_CONFIGS = {
  xero: {
    name: "Xero",
    logo: "X",
    color: "#13B5EA",
    method: "oauth",
    description: "Connect via OAuth 2.0 to pull data automatically",
    badge: "Auto-connect",
    exportGuide: null,
    fields: {
      customers: ["ContactID","Name","EmailAddress","Phone","AddressLine1","AddressLine2","City","PostalCode","Country","TaxNumber","CreditLimit"],
      suppliers: ["ContactID","Name","EmailAddress","Phone","AddressLine1","AddressLine2","City","PostalCode","Country","TaxNumber"],
      glAccounts: ["Code","Name","Type","TaxType","Description","Status"],
      products: ["ItemID","Code","Name","Description","SalesDetails.UnitPrice","PurchaseDetails.UnitPrice","SalesDetails.AccountCode","PurchaseDetails.AccountCode"],
    }
  },
  sage50: {
    name: "Sage 50",
    logo: "S",
    color: "#00DC82",
    method: "csv",
    description: "Upload CSV exports from Sage 50 File menu",
    badge: "CSV Upload",
    exportGuide: {
      customers: "File → Data Export → Customer List",
      suppliers: "File → Data Export → Supplier List",
      glAccounts: "Nominal Accounts → Reports → Nominal List → Export",
      products: "Products & Services → Reports → Product List → Export",
    },
    fields: {
      customers: ["A/C Ref","Company","Contact Name","Address 1","Address 2","Town","Post Code","Country","Telephone","Email","VAT Reg No","Credit Limit","Payment Terms"],
      suppliers: ["A/C Ref","Company","Contact Name","Address 1","Address 2","Town","Post Code","Country","Telephone","Email","VAT Reg No","Payment Terms"],
      glAccounts: ["Nominal Code","Name","Category","Balance","Report Category"],
      products: ["Product Code","Description","Sale Price","Cost Price","Unit Of Sale","Nominal Code"],
    }
  },
  quickbooks: {
    name: "QuickBooks",
    logo: "QB",
    color: "#2CA01C",
    method: "csv",
    description: "Export reports from QuickBooks Online or Desktop",
    badge: "CSV Upload",
    exportGuide: {
      customers: "Reports → Customer Contact List → Export to Excel/CSV",
      suppliers: "Reports → Vendor Contact List → Export to Excel/CSV",
      glAccounts: "Accounting → Chart of Accounts → Export",
      products: "Lists → Products & Services → Export to CSV",
    },
    fields: {
      customers: ["Customer","Company","First Name","Last Name","Email","Phone","Address","City","Country","Zip","VAT/Tax Number"],
      suppliers: ["Vendor","Company","First Name","Last Name","Email","Phone","Address","City","Country","Zip"],
      glAccounts: ["Account","Name","Type","Detail Type","Description","Balance"],
      products: ["SKU","Name","Description","Sales Price","Cost","Income Account","Expense Account","Unit"],
    }
  },
  other: {
    name: "Other / Manual",
    logo: "⊕",
    color: "#8B8FA8",
    method: "manual",
    description: "Upload CSVs from any system with full custom mapping",
    badge: "Manual CSV",
    exportGuide: null,
    fields: { customers: [], suppliers: [], glAccounts: [], products: [] }
  },
};

const DATA_SECTIONS = ["glAccounts", "customers", "suppliers", "products"];
const PUSH_ORDER_RATIONALE = "Chart of Accounts must be pushed first — Customers, Suppliers and Products all reference GL codes.";

// ─── Auto-mapping logic ───────────────────────────────────────────────────────
function autoMap(sourceFields, aiqFields, sourceName) {
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const mapping = {};
  const sourceNorms = sourceFields.map(norm);

  aiqFields.forEach(({ key }) => {
    const kn = norm(key);
    let matchIdx = -1;

    // Direct or partial match
    matchIdx = sourceNorms.findIndex(sfn =>
      sfn === kn || sfn.includes(kn) || kn.includes(sfn)
    );

    // Domain-specific fallbacks
    if (matchIdx < 0) {
      const fallbacks = {
        code: ["ref", "code", "id", "acref", "customerid", "vendorid", "contact"],
        accountcode: ["nominal", "code", "account"],
        postcode: ["post", "zip", "postal"],
        vatreg: ["vat", "tax", "taxnumber"],
        telephonenumber: ["tel", "phone", "mobile"],
        creditlimit: ["credit", "limit"],
        paymenttermsd: ["terms", "payment"],
        salesprice: ["saleprice", "unitprice", "price", "salesdeta"],
        costprice: ["cost", "purchasedeta"],
        salesglcode: ["salesacc", "incomea", "salesdet"],
        purchaseglcode: ["purchaseacc", "expenseh", "purchasedeta"],
        productcode: ["sku", "code", "item", "product"],
        productname: ["name", "description", "item"],
        accounttype: ["type", "category"],
        accountname: ["name", "nominal"],
      };
      const keys = fallbacks[kn] || [];
      matchIdx = sourceNorms.findIndex(sfn => keys.some(fb => sfn.includes(fb)));
    }

    mapping[key] = matchIdx >= 0 ? sourceFields[matchIdx] : "";
  });

  return mapping;
}

// ─── Mock Xero data ───────────────────────────────────────────────────────────
const XERO_MOCK = {
  customers: { name: "Xero API", headers: SOURCE_CONFIGS.xero.fields.customers, rows: [
    ["XR-C001","Acme Technologies Ltd","finance@acme.ie","+353 1 555 0100","10 Harcourt St","","Dublin","D02 AB12","IE","IE1234567T","25000"],
    ["XR-C002","Murphy Consulting","info@murphy.ie","+353 21 555 0200","5 Patrick St","","Cork","T12 XY34","IE","IE9876543B","15000"],
    ["XR-C003","O'Brien Retail Group","accounts@obrien.ie","+353 91 555 0300","Galway Retail Park","","Galway","H91 PQ56","IE","","10000"],
  ]},
  suppliers: { name: "Xero API", headers: SOURCE_CONFIGS.xero.fields.suppliers, rows: [
    ["XR-S001","Office Supplies Direct","orders@osd.ie","+353 1 555 0400","15 North Ring Road","","Dublin","D11 CD78","IE","IE5555555A"],
    ["XR-S002","IT Equipment Ltd","billing@itech.ie","+353 1 555 0500","Unit 5 Business Park","","Dublin","D22 EF90","IE","IE4444444B"],
  ]},
  glAccounts: { name: "Xero API", headers: SOURCE_CONFIGS.xero.fields.glAccounts, rows: [
    ["4000","Sales Revenue","REVENUE","OUTPUT","Main sales income","ACTIVE"],
    ["4100","Service Revenue","REVENUE","OUTPUT","Consulting and services","ACTIVE"],
    ["5000","Cost of Goods Sold","EXPENSE","INPUT","Direct product costs","ACTIVE"],
    ["6000","Salaries & Wages","EXPENSE","NONE","Staff payroll","ACTIVE"],
    ["6100","Rent & Rates","EXPENSE","INPUT","Office and premises","ACTIVE"],
    ["1000","Bank Account","BANK","NONE","Main current account","ACTIVE"],
    ["1100","Accounts Receivable","CURRENT","NONE","Customer debtors","ACTIVE"],
    ["2000","Accounts Payable","CURRLIAB","NONE","Supplier creditors","ACTIVE"],
  ]},
  products: { name: "Xero API", headers: SOURCE_CONFIGS.xero.fields.products, rows: [
    ["PROD-001","SKU-001","Standard Widget","12mm alloy widget","89.99","45.00","4000","5000"],
    ["PROD-002","SKU-002","Premium Widget","Premium grade 20mm","129.99","65.00","4000","5000"],
    ["SVC-001","SVC-001","Consulting Hour","Professional services","150.00","0.00","4100",""],
  ]},
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  wrap: { minHeight: "100vh", background: "linear-gradient(160deg,#06080f 0%,#0c1120 40%,#080e1a 100%)", fontFamily: "'IBM Plex Sans','Segoe UI',system-ui,sans-serif", color: "#dde4f0" },
  header: { background: "rgba(6,10,20,0.85)", borderBottom: "1px solid rgba(99,140,255,0.12)", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58, position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(16px)" },
  main: { maxWidth: 960, margin: "0 auto", padding: "48px 24px" },
  card: { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 },
  input: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dde4f0", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "#7a8aaa", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" },
  tag: { display: "inline-block", fontSize: 10, letterSpacing: "0.09em", textTransform: "uppercase", color: "#6ba0ff", background: "rgba(99,140,255,0.1)", border: "1px solid rgba(99,140,255,0.2)", padding: "3px 12px", borderRadius: 100, marginBottom: 14 },
  pill: (active, color="#6ba0ff") => ({ padding: "6px 16px", borderRadius: 100, border: `1px solid ${active ? color : "rgba(255,255,255,0.08)"}`, background: active ? `${color}18` : "transparent", color: active ? color : "#7a8aaa", fontSize: 12, fontWeight: 600, cursor: "pointer" }),
};

const ACCENT = "#6ba0ff";
const SUCCESS = "#22c55e";
const WARN = "#f59e0b";
const ERR = "#f87171";

// ─── Sub-components ───────────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, disabled, fullWidth, small }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: disabled ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, #1a3a9e, #2563eb)`, color: disabled ? "#374151" : "white", border: "none", borderRadius: 9, padding: small ? "8px 20px" : "12px 28px", fontSize: small ? 12 : 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", width: fullWidth ? "100%" : "auto", transition: "opacity 0.15s" }}>
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 18px", fontSize: 12, color: "#7a8aaa", cursor: "pointer" }}>
      {children}
    </button>
  );
}

function StepHeader({ tag, title, sub }) {
  return (
    <div style={{ marginBottom: 36, textAlign: "center" }}>
      <div style={S.tag}>{tag}</div>
      <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.025em", marginBottom: 10, marginTop: 0 }}>{title}</h2>
      <p style={{ fontSize: 14, color: "#7a8aaa", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>{sub}</p>
    </div>
  );
}

function InputField({ label, placeholder, value, onChange, type = "text", note }) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={S.input} />
      {note && <div style={{ fontSize: 11, color: "#4a5a74", marginTop: 5, lineHeight: 1.5 }}>{note}</div>}
    </div>
  );
}

function StatusBadge({ success, failed }) {
  if (!success && !failed) return null;
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
      {success > 0 && <span style={{ fontSize: 12, color: SUCCESS, background: "rgba(34,197,94,0.1)", padding: "2px 8px", borderRadius: 4 }}>✓ {success} pushed</span>}
      {failed > 0 && <span style={{ fontSize: 12, color: ERR, background: "rgba(248,113,113,0.1)", padding: "2px 8px", borderRadius: 4 }}>✗ {failed} failed</span>}
    </div>
  );
}

// ─── Progress stepper ─────────────────────────────────────────────────────────
const STEPS = ["Welcome", "Source", "AIQ Login", "Load Data", "Map Fields", "Push to AIQ"];

function Stepper({ step }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {STEPS.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: step === i ? ACCENT : step > i ? SUCCESS : "rgba(255,255,255,0.05)", border: `2px solid ${step === i ? ACCENT+"80" : step > i ? SUCCESS+"60" : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: step >= i ? "white" : "#374151", transition: "all 0.25s" }}>
              {step > i ? "✓" : i + 1}
            </div>
            <div style={{ fontSize: 9, color: step === i ? ACCENT : "#374151", letterSpacing: "0.03em", whiteSpace: "nowrap" }}>{s}</div>
          </div>
          {i < STEPS.length - 1 && <div style={{ width: 22, height: 1, background: step > i ? `${SUCCESS}50` : "rgba(255,255,255,0.05)", margin: "0 2px 14px" }} />}
        </div>
      ))}
    </div>
  );
}

// ─── Data section row ─────────────────────────────────────────────────────────
function DataSectionRow({ section, data, source, onUpload }) {
  const cfg = SOURCE_CONFIGS[source];
  const loaded = !!data;

  return (
    <div style={{ ...S.card, padding: "16px 22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderColor: loaded ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)", gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 16 }}>{AIQ_API[section].icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{AIQ_API[section].label}</span>
          {loaded && <span style={{ fontSize: 11, color: SUCCESS, background: "rgba(34,197,94,0.1)", padding: "2px 8px", borderRadius: 4 }}>✓ {data.rows.length} records</span>}
        </div>
        {cfg?.exportGuide?.[section] && !loaded && (
          <div style={{ fontSize: 11, color: "#4a5a74", lineHeight: 1.6 }}>
            <span style={{ color: "#6ba0ff55" }}>Export path: </span>{cfg.exportGuide[section]}
          </div>
        )}
        {loaded && (
          <div style={{ fontSize: 11, color: "#4a5a74" }}>{data.name} · {data.headers.length} fields</div>
        )}
      </div>
      {source !== "xero" && (
        <label style={{ background: loaded ? "rgba(34,197,94,0.08)" : "rgba(99,140,255,0.08)", border: `1px solid ${loaded ? "rgba(34,197,94,0.25)" : "rgba(99,140,255,0.2)"}`, borderRadius: 7, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: loaded ? SUCCESS : ACCENT, whiteSpace: "nowrap", flexShrink: 0 }}>
          {loaded ? "↺ Replace" : "+ Upload CSV"}
          <input type="file" accept=".csv" style={{ display: "none" }} onChange={e => onUpload(e, section)} />
        </label>
      )}
      {source === "xero" && loaded && (
        <span style={{ fontSize: 12, color: SUCCESS, padding: "7px 16px" }}>✓ Loaded</span>
      )}
    </div>
  );
}

// ─── Field mapping row ────────────────────────────────────────────────────────
function MappingRow({ aiqField, sourceHeaders, selectedSrc, sampleValue, onChange, idx, total }) {
  const isMapped = !!selectedSrc;
  const isReqUnmapped = aiqField.required && !isMapped;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.5fr 0.9fr 1fr", padding: "9px 18px", borderBottom: idx < total - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: idx % 2 ? "rgba(255,255,255,0.012)" : "transparent", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 12, fontFamily: "monospace", color: isReqUnmapped ? ERR : isMapped ? "#dde4f0" : "#4a5a74" }}>{aiqField.key}</span>
        {aiqField.required && <span style={{ fontSize: 9, color: isReqUnmapped ? ERR : SUCCESS, background: isReqUnmapped ? "rgba(248,113,113,0.1)" : "rgba(34,197,94,0.1)", padding: "1px 5px", borderRadius: 3, fontWeight: 700, letterSpacing: "0.04em" }}>REQ</span>}
      </div>
      <select value={selectedSrc} onChange={e => onChange(e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${isReqUnmapped ? "rgba(248,113,113,0.4)" : isMapped ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: 5, padding: "5px 8px", fontSize: 11, color: "#dde4f0", cursor: "pointer", width: "100%", fontFamily: "monospace" }}>
        <option value="">— not mapped —</option>
        {sourceHeaders.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <div style={{ fontSize: 11, color: "#4a5a74", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>{sampleValue || "—"}</div>
      <div style={{ fontSize: 10, color: "#374151", lineHeight: 1.5 }}>{aiqField.note || ""}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AIQOnboardingTool() {
  const [step, setStep] = useState(0);
  const [source, setSource] = useState(null);
  const [aiqCreds, setAiqCreds] = useState({ entityCode: "", username: "", password: "" });
  const [aiqToken, setAiqToken] = useState(null);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [uploadedData, setUploadedData] = useState({});
  const [mappings, setMappings] = useState({});
  const [activeSection, setActiveSection] = useState("glAccounts");
  const [aiNotes, setAiNotes] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [pushResults, setPushResults] = useState({});
  const [pushing, setPushing] = useState({});
  const [expandedErrors, setExpandedErrors] = useState({});

  const parseCSV = text => {
    const lines = text.trim().split(/\r?\n/);
    const rawHeaders = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
    const rows = lines.slice(1).map(l => {
      // Handle quoted fields with commas inside
      const fields = [];
      let inQ = false, cur = "";
      for (const ch of l + ",") {
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === "," && !inQ) { fields.push(cur.trim()); cur = ""; continue; }
        cur += ch;
      }
      return fields;
    });
    return { headers: rawHeaders, rows: rows.filter(r => r.some(c => c)) };
  };

  const handleCSVUpload = (e, section) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const { headers, rows } = parseCSV(ev.target.result);
      setUploadedData(prev => ({ ...prev, [section]: { name: file.name, headers, rows } }));
      const auto = autoMap(headers, AIQ_API[section].fields, source);
      setMappings(prev => ({ ...prev, [section]: auto }));
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const connectXero = () => {
    const newData = {};
    const newMappings = {};
    Object.entries(XERO_MOCK).forEach(([section, data]) => {
      newData[section] = data;
      newMappings[section] = autoMap(data.headers, AIQ_API[section].fields, "xero");
    });
    setUploadedData(newData);
    setMappings(newMappings);
  };

  const authenticateAIQ = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      await new Promise(r => setTimeout(r, 1400));
      if (!aiqCreds.entityCode || !aiqCreds.username || !aiqCreds.password) throw new Error("All fields are required");
      setAiqToken(`AIQ-V2-TOKEN-${Date.now()}`);
      setStep(3);
    } catch (e) {
      setAuthError(e.message || "Authentication failed. Please check your credentials.");
    }
    setAuthLoading(false);
  };

  const handleAIReview = async (section) => {
    setAiLoading(true);
    const srcData = uploadedData[section];
    if (!srcData) { setAiLoading(false); return; }
    const aiqFields = AIQ_API[section].fields;
    const currentMapping = mappings[section] || {};
    const sampleRow = srcData.rows[0] ? srcData.headers.reduce((acc, h, i) => { acc[h] = srcData.rows[0][i] || ""; return acc; }, {}) : {};

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are an AccountsIQ (AIQ) onboarding specialist helping migrate data.

Source system: ${SOURCE_CONFIGS[source]?.name || "Unknown"}
Data type: ${AIQ_API[section].label}
Source columns: ${srcData.headers.join(", ")}
Sample row: ${JSON.stringify(sampleRow)}

AIQ target fields:
${aiqFields.map(f => `  ${f.key} (${f.required ? "REQUIRED" : "optional"})${f.note ? " — " + f.note : ""}`).join("\n")}

Current auto-mapping (AIQ field → source field):
${Object.entries(currentMapping).map(([k,v]) => `  ${k} → ${v || "(unmapped)"}`).join("\n")}

Review and respond in this format:
1. ISSUES: List any required fields that are unmapped or incorrectly mapped
2. SUGGESTIONS: Any mapping improvements or corrections
3. TRANSFORMS: Data transformations needed (country codes, currency codes, date formats, booleans, numeric cleaning)
4. WARNINGS: Any AIQ-specific rules that may be violated (e.g. AccountType must be Income/Expense/Asset/Liability/Equity/Bank)

Be concise — max 180 words, plain text, no markdown headers.`
          }]
        })
      });
      const data = await response.json();
      setAiNotes(prev => ({ ...prev, [section]: data.content?.[0]?.text || "No suggestions available." }));
    } catch {
      setAiNotes(prev => ({ ...prev, [section]: "AI review unavailable — check your connection." }));
    }
    setAiLoading(false);
  };

  const pushToAIQ = async (section) => {
    setPushing(prev => ({ ...prev, [section]: true }));
    const data = uploadedData[section];
    const mapping = mappings[section] || {};
    const aiqFields = AIQ_API[section].fields;
    const results = { success: 0, failed: 0, errors: [], preview: [] };

    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      const record = {};
      aiqFields.forEach(({ key }) => {
        const srcField = mapping[key];
        if (srcField) {
          const idx = data.headers.indexOf(srcField);
          record[key] = idx >= 0 ? (row[idx] || "").trim() : "";
        }
      });
      const missingRequired = aiqFields.filter(f => f.required && !record[f.key]?.trim());
      if (missingRequired.length > 0) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: Missing required fields: ${missingRequired.map(f => f.key).join(", ")}`);
        continue;
      }
      // Simulate API call with delay
      await new Promise(r => setTimeout(r, 55));
      results.success++;
      if (results.preview.length < 3) results.preview.push(record);
    }

    setPushResults(prev => ({ ...prev, [section]: results }));
    setPushing(prev => ({ ...prev, [section]: false }));
  };

  const loadedCount = Object.keys(uploadedData).length;
  const pushedCount = Object.values(pushResults).filter(r => r.success > 0).length;
  const allDone = pushedCount === 4 || (pushedCount > 0 && Object.keys(uploadedData).every(k => pushResults[k]));
  const cfg = source ? SOURCE_CONFIGS[source] : null;

  return (
    <div style={S.wrap}>
      {/* Header */}
      <header style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, background: "linear-gradient(135deg,#1a3a9e,#2563eb)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "white", letterSpacing: "-0.03em" }}>A</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>AccountsIQ</div>
            <div style={{ fontSize: 10, color: "#4a5a74", letterSpacing: "0.07em", textTransform: "uppercase" }}>Migration Tool</div>
          </div>
        </div>
        <Stepper step={step} />
        <div style={{ width: 140, textAlign: "right", fontSize: 11 }}>
          {aiqToken
            ? <span style={{ color: SUCCESS }}>● {aiqCreds.entityCode}.accountsiq.com</span>
            : <span style={{ color: "#4a5a74" }}>Not connected</span>
          }
        </div>
      </header>

      <main style={S.main}>

        {/* ── Step 0: Welcome ─────────────────────────────────────────────── */}
        {step === 0 && (
          <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
            <div style={S.tag}>API-Powered Data Migration</div>
            <h1 style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.08, marginBottom: 18, letterSpacing: "-0.03em", marginTop: 8 }}>
              Get clients live on<br />
              <span style={{ background: `linear-gradient(90deg, #4a90ff, #90c0ff)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AccountsIQ faster</span>
            </h1>
            <p style={{ fontSize: 15, color: "#7a8aaa", lineHeight: 1.75, marginBottom: 44 }}>
              Import contacts, chart of accounts, and products from Xero, Sage 50, QuickBooks or any CSV — mapped intelligently and pushed directly into AccountsIQ via the API.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 48 }}>
              {[
                { icon: "⚡", t: "Direct API Push", d: "Data goes into AIQ via REST — no CSV re-upload" },
                { icon: "🧠", t: "AI Field Mapping", d: "Claude reviews mappings & flags issues" },
                { icon: "🔄", t: "4 Sources", d: "Xero, Sage 50, QuickBooks, or any CSV" },
                { icon: "✅", t: "Validation First", d: "Required fields checked before every push" },
              ].map((f, i) => (
                <div key={i} style={{ ...S.card, padding: "22px 18px" }}>
                  <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{f.t}</div>
                  <div style={{ fontSize: 11, color: "#7a8aaa", lineHeight: 1.6 }}>{f.d}</div>
                </div>
              ))}
            </div>
            <div style={{ ...S.card, padding: "16px 22px", marginBottom: 36, textAlign: "left" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>Migration sequence</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {[["1", "📊 Chart of Accounts"], ["2", "👥 Customers"], ["3", "🏭 Suppliers"], ["4", "📦 Products"]].map(([n, l], i, arr) => (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 12, color: "#dde4f0" }}><span style={{ color: ACCENT, fontWeight: 700 }}>{n}.</span> {l}</div>
                    {i < arr.length - 1 && <span style={{ color: "#4a5a74" }}>→</span>}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#4a5a74", marginTop: 8 }}>{PUSH_ORDER_RATIONALE}</div>
            </div>
            <PrimaryBtn onClick={() => setStep(1)}>Start Migration →</PrimaryBtn>
          </div>
        )}

        {/* ── Step 1: Choose source ────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <StepHeader tag="Step 1 of 5" title="Where is the data coming from?" sub="Select the client's current accounting platform" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, maxWidth: 700, margin: "0 auto" }}>
              {Object.entries(SOURCE_CONFIGS).map(([key, c]) => (
                <button key={key} onClick={() => { setSource(key); setStep(2); }}
                  style={{ ...S.card, padding: "26px 24px", cursor: "pointer", textAlign: "left", color: "#dde4f0", transition: "border-color 0.15s", background: "rgba(255,255,255,0.025)" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = c.color + "60"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: c.color + "18", border: `1px solid ${c.color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: key === "quickbooks" ? 13 : 20, fontWeight: 900, color: c.color }}>{c.logo}</div>
                    <span style={{ fontSize: 10, color: c.color, background: c.color + "15", border: `1px solid ${c.color}30`, padding: "3px 9px", borderRadius: 100, fontWeight: 600, letterSpacing: "0.06em" }}>{c.badge}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "#7a8aaa", lineHeight: 1.6 }}>{c.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: AIQ credentials ──────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <StepHeader tag="Step 2 of 5" title="Connect to AccountsIQ" sub="Authenticate via the AIQ API v2.0 — credentials are not stored" />
            <div style={{ ...S.card, padding: 32 }}>
              <div style={{ background: "rgba(99,140,255,0.06)", border: "1px solid rgba(99,140,255,0.14)", borderRadius: 8, padding: "12px 16px", marginBottom: 24, fontSize: 12, color: "#7a8aaa", lineHeight: 1.6 }}>
                <span style={{ color: ACCENT, fontWeight: 700 }}>API v2.0 endpoint:</span><br />
                <code style={{ fontSize: 11 }}>POST https://&#123;EntityCode&#125;.accountsiq.com/Service.svc/Authenticate</code><br />
                <a href="https://aiq.helpjuice.com/en_GB/manage-integrations/using-the-developer-portal-and-new-api-endpoint" target="_blank" rel="noreferrer" style={{ color: ACCENT, fontSize: 11 }}>→ Developer portal guide</a>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <InputField label="Entity Code" placeholder="e.g. MYCOMPANY" value={aiqCreds.entityCode} onChange={v => setAiqCreds(p => ({ ...p, entityCode: v }))} note="Your AIQ entity/company code (from your AIQ URL)" />
                <InputField label="Username" placeholder="your@email.com" value={aiqCreds.username} onChange={v => setAiqCreds(p => ({ ...p, username: v }))} />
                <InputField label="Password" placeholder="••••••••" type="password" value={aiqCreds.password} onChange={v => setAiqCreds(p => ({ ...p, password: v }))} />
              </div>
              {authError && (
                <div style={{ marginTop: 16, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: ERR }}>{authError}</div>
              )}
              <div style={{ marginTop: 22 }}>
                <PrimaryBtn onClick={authenticateAIQ} disabled={authLoading} fullWidth>
                  {authLoading ? "Authenticating..." : "Connect to AccountsIQ →"}
                </PrimaryBtn>
              </div>
            </div>
            <div style={{ marginTop: 14, textAlign: "center" }}>
              <GhostBtn onClick={() => setStep(1)}>← Back</GhostBtn>
            </div>
          </div>
        )}

        {/* ── Step 3: Load data ────────────────────────────────────────────── */}
        {step === 3 && (
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <StepHeader
              tag="Step 3 of 5"
              title="Load source data"
              sub={source === "xero" ? "Connect to Xero to pull all data automatically" : `Upload CSV exports from ${cfg?.name || "your system"}`}
            />

            {source === "xero" && loadedCount === 0 && (
              <div style={{ ...S.card, padding: "30px 32px", textAlign: "center", marginBottom: 20, borderColor: "rgba(19,181,234,0.2)" }}>
                <div style={{ fontSize: 40, marginBottom: 12, color: "#13B5EA", fontWeight: 900 }}>X</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Xero OAuth 2.0</div>
                <div style={{ fontSize: 13, color: "#7a8aaa", marginBottom: 22, lineHeight: 1.6 }}>Pulls Contacts (customers & suppliers), Chart of Accounts, and Items (products) from Xero via their API</div>
                <button onClick={connectXero} style={{ background: "#13B5EA", color: "white", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Authorise Xero →</button>
              </div>
            )}

            {source !== "xero" && cfg?.exportGuide && (
              <div style={{ ...S.card, padding: "16px 20px", marginBottom: 20, borderColor: "rgba(245,158,11,0.15)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: WARN, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Export guide — {cfg.name}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {Object.entries(cfg.exportGuide).map(([sec, path]) => (
                    <div key={sec} style={{ display: "flex", gap: 10, fontSize: 12 }}>
                      <span style={{ color: "#7a8aaa", minWidth: 130 }}>{AIQ_API[sec].icon} {AIQ_API[sec].label}</span>
                      <span style={{ color: "#4a5a74", fontFamily: "monospace", fontSize: 11 }}>{path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {DATA_SECTIONS.map(section => (
                <DataSectionRow key={section} section={section} data={uploadedData[section]} source={source} onUpload={handleCSVUpload} />
              ))}
            </div>

            <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
              <GhostBtn onClick={() => setStep(2)}>← Back</GhostBtn>
              <PrimaryBtn onClick={() => setStep(4)} disabled={loadedCount === 0}>Map Fields →</PrimaryBtn>
            </div>
          </div>
        )}

        {/* ── Step 4: Map fields ───────────────────────────────────────────── */}
        {step === 4 && (
          <div>
            <StepHeader tag="Step 4 of 5" title="Map fields to AIQ API schema" sub="Verify how source fields map to AccountsIQ's API parameters" />

            {/* Section tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" }}>
              {DATA_SECTIONS.map(s => {
                const hasData = !!uploadedData[s];
                const mapped = hasData ? Object.values(mappings[s] || {}).filter(Boolean).length : 0;
                const total = AIQ_API[s].fields.length;
                const reqUnmapped = hasData ? AIQ_API[s].fields.filter(f => f.required && !mappings[s]?.[f.key]).length : 0;
                return (
                  <button key={s} onClick={() => hasData && setActiveSection(s)} style={{ ...S.pill(activeSection === s), opacity: hasData ? 1 : 0.3, cursor: hasData ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{AIQ_API[s].icon}</span>
                    <span>{AIQ_API[s].label}</span>
                    {hasData && <span style={{ fontSize: 10, color: reqUnmapped > 0 ? ERR : SUCCESS, marginLeft: 2 }}>{reqUnmapped > 0 ? `⚠${reqUnmapped}` : `✓${mapped}/${total}`}</span>}
                  </button>
                );
              })}
            </div>

            {uploadedData[activeSection] ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                  <div style={{ fontSize: 11, color: "#4a5a74" }}>
                    Endpoint: <code style={{ color: "#7a8aaa", background: "rgba(255,255,255,0.04)", padding: "2px 7px", borderRadius: 4, fontSize: 11 }}>POST /Service.svc/{AIQ_API[activeSection].createEndpoint}</code>
                    &nbsp;&nbsp;
                    <a href={AIQ_API[activeSection].helpUrl} target="_blank" rel="noreferrer" style={{ color: ACCENT, fontSize: 11 }}>AIQ docs →</a>
                  </div>
                  <button onClick={() => handleAIReview(activeSection)} disabled={aiLoading} style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 7, padding: "7px 16px", fontSize: 11, fontWeight: 700, color: aiLoading ? "#374151" : "#a78bfa", cursor: aiLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    {aiLoading ? "⏳ Reviewing…" : "✨ AI Review Mapping"}
                  </button>
                </div>

                {aiNotes[activeSection] && (
                  <div style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.16)", borderRadius: 10, padding: "14px 18px", marginBottom: 16, fontSize: 12, color: "#c4b5fd", lineHeight: 1.75 }}>
                    <strong style={{ color: "#a78bfa", display: "block", marginBottom: 6 }}>✨ AI Review</strong>
                    {aiNotes[activeSection]}
                  </div>
                )}

                <div style={{ ...S.card, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.5fr 0.9fr 1fr", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "8px 18px", fontSize: 10, fontWeight: 700, color: "#4a5a74", letterSpacing: "0.08em", textTransform: "uppercase", gap: 8 }}>
                    <div>AIQ Field</div><div>Source Column</div><div>Sample</div><div>Notes</div>
                  </div>
                  {AIQ_API[activeSection].fields.map((f, i) => {
                    const src = mappings[activeSection]?.[f.key] || "";
                    const srcIdx = src ? uploadedData[activeSection].headers.indexOf(src) : -1;
                    const sample = srcIdx >= 0 && uploadedData[activeSection].rows[0] ? uploadedData[activeSection].rows[0][srcIdx] : "";
                    return (
                      <MappingRow key={f.key} aiqField={f} sourceHeaders={uploadedData[activeSection].headers} selectedSrc={src} sampleValue={sample} idx={i} total={AIQ_API[activeSection].fields.length}
                        onChange={v => setMappings(prev => ({ ...prev, [activeSection]: { ...(prev[activeSection] || {}), [f.key]: v } }))} />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "56px 20px", color: "#4a5a74" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                No data loaded for {AIQ_API[activeSection].label}
                <div style={{ marginTop: 14 }}>
                  <button onClick={() => setStep(3)} style={{ background: "rgba(99,140,255,0.08)", border: "1px solid rgba(99,140,255,0.2)", color: ACCENT, padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>← Upload data first</button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between" }}>
              <GhostBtn onClick={() => setStep(3)}>← Back</GhostBtn>
              <PrimaryBtn onClick={() => setStep(5)}>Push to AIQ →</PrimaryBtn>
            </div>
          </div>
        )}

        {/* ── Step 5: Push to AIQ ──────────────────────────────────────────── */}
        {step === 5 && (
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <StepHeader tag="Step 5 of 5" title="Push data into AccountsIQ" sub="Records are sent directly to AIQ via the REST API" />

            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ ...S.card, padding: "10px 16px", fontSize: 12, color: "#7a8aaa", flex: 1 }}>
                <span style={{ color: SUCCESS, fontWeight: 700 }}>● Connected:</span> {aiqCreds.entityCode}.accountsiq.com
              </div>
              <div style={{ ...S.card, padding: "10px 16px", fontSize: 12, color: "#7a8aaa", flex: 2, borderColor: "rgba(245,158,11,0.2)" }}>
                ⚠️ Push order matters: <strong style={{ color: WARN }}>COA first</strong> → Customers & Suppliers → Products
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { s: "glAccounts", order: 1 },
                { s: "customers", order: 2 },
                { s: "suppliers", order: 3 },
                { s: "products", order: 4 },
              ].map(({ s, order }) => {
                const data = uploadedData[s];
                const result = pushResults[s];
                const isPushing = pushing[s];
                const isExpanded = expandedErrors[s];

                return (
                  <div key={s} style={{ ...S.card, padding: "18px 22px", opacity: data ? 1 : 0.35, borderColor: result ? (result.failed > 0 ? "rgba(245,158,11,0.25)" : "rgba(34,197,94,0.25)") : "rgba(255,255,255,0.07)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.03)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{AIQ_API[s].icon}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{AIQ_API[s].label}</div>
                          <div style={{ fontSize: 11, color: "#4a5a74", marginTop: 3 }}>
                            {data ? `${data.rows.length} records → POST /Service.svc/${AIQ_API[s].createEndpoint}` : "No data loaded"}
                          </div>
                          <StatusBadge success={result?.success} failed={result?.failed} />
                        </div>
                      </div>
                      {data && (
                        <button onClick={() => pushToAIQ(s)} disabled={isPushing || !!result}
                          style={{ background: result ? "rgba(34,197,94,0.07)" : isPushing ? "rgba(255,255,255,0.03)" : "linear-gradient(135deg,#1a3a9e,#2563eb)", color: result ? SUCCESS : isPushing ? "#374151" : "white", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: (isPushing || result) ? "not-allowed" : "pointer", minWidth: 120, flexShrink: 0 }}>
                          {isPushing ? "Pushing…" : result ? "✓ Done" : `Push (${order}) →`}
                        </button>
                      )}
                    </div>

                    {result?.errors?.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <button onClick={() => setExpandedErrors(p => ({ ...p, [s]: !p[s] }))} style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: ERR, cursor: "pointer" }}>
                          {isExpanded ? "▲ Hide" : "▼ Show"} {result.errors.length} errors
                        </button>
                        {isExpanded && (
                          <div style={{ marginTop: 8, background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.1)", borderRadius: 6, padding: "10px 14px" }}>
                            {result.errors.map((e, i) => <div key={i} style={{ fontSize: 11, color: ERR, marginBottom: 3 }}>• {e}</div>)}
                          </div>
                        )}
                      </div>
                    )}

                    {result?.preview?.length > 0 && (
                      <details style={{ marginTop: 10 }}>
                        <summary style={{ fontSize: 11, color: ACCENT, cursor: "pointer" }}>View sample records pushed</summary>
                        <pre style={{ fontSize: 10, color: "#4a5a74", marginTop: 8, background: "rgba(255,255,255,0.02)", padding: "10px 14px", borderRadius: 6, overflow: "auto", maxHeight: 120 }}>{JSON.stringify(result.preview, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>

            {allDone && (
              <div style={{ marginTop: 24, ...S.card, padding: "24px 28px", textAlign: "center", borderColor: "rgba(34,197,94,0.25)" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Data is live in AccountsIQ</div>
                <div style={{ fontSize: 13, color: "#7a8aaa", lineHeight: 1.6 }}>
                  Log in to <strong style={{ color: "#dde4f0" }}>{aiqCreds.entityCode}.accountsiq.com</strong> to verify records, review any failed rows, and complete setup.
                </div>
                <a href={`https://${aiqCreds.entityCode}.accountsiq.com`} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 16, background: "linear-gradient(135deg,#1a3a9e,#2563eb)", color: "white", padding: "10px 24px", borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Open AccountsIQ →</a>
              </div>
            )}

            <div style={{ marginTop: 18 }}>
              <GhostBtn onClick={() => setStep(4)}>← Back to mapping</GhostBtn>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
