// classificationEngine_v3.js
// Full orchestration: Federal D-codes (D001–D043, data-driven) w/ CFR popups,
// Listed wastes, CERCLA/TSCA overlays, Texas state logic (RG-22 + Appendix D),
// DOT hinting, audit trail, and push hooks to LabPack/Manifest.

import FederalCharacteristicBot from "../microbots/FederalCharacteristicBot.js";
import FederalListedBot from "../microbots/FederalListedBot.js";
import CERCLA_TSCABot from "../microbots/CERCLA_TSCABot.js";
import TexasStateLogicBot from "../microbots/TexasStateLogicBot.js";
import DOTShippingBot from "../microbots/DOTShippingBot.js";
import AuditLogger from "../microbots/AuditLogger.js";
import { PopupManager } from "../ui/PopupManager.js";
import { requireJSON, ensureArray, nowISO, deepFreeze } from "../utils/engineUtils.js";
import { validateDatasets } from "../utils/validators.js";
import { pushToLabPack } from "../integrations/LabPackPush.js";
import { pushToManifest } from "../integrations/ManifestPush.js";

const PATHS = deepFreeze({
  D_CODES: "/src/data/federal/d_codes_limits.json",
  P_CODES: "/src/data/federal/p_codes.json",
  U_CODES: "/src/data/federal/u_codes.json",
  F_CODES: "/src/data/federal/f_codes.json",
  K_CODES: "/src/data/federal/k_codes.json",
  CERCLA: "/src/data/federal/cercla_substances.json",
  TSCA: "/src/data/federal/tsca_substances.json",
  DOT_UN: "/src/data/dot/dot_shipping_codes.json",
  TX_RG22: "/src/data/regulatory/tx/rg22_tables.json",
  TX_APP_D: "/src/data/regulatory/tx/appendix_d_constituents.json",
  TX_STATE: "/src/data/regulatory/tx/state_waste_codes.json",
});

/**
 * Advanced SDS Classification Engine v3
 * 
 * Provides complete hazardous waste classification using multi-bot orchestration:
 * - Federal characteristic codes (D001-D043) with CFR regulatory lookup
 * - Federal listed waste codes (P, U, F, K-codes)
 * - CERCLA/TSCA overlay analysis for reportable quantities
 * - Texas state classification (RG-22 + Appendix D logic)
 * - DOT shipping classification and UN numbers
 * - Audit trail generation and regulatory compliance tracking
 * - Integration hooks for lab pack planning and manifest generation
 * 
 * @param {Object} params - Classification parameters
 * @param {string} params.sdsId - Unique identifier for the SDS being classified
 * @param {string} params.productName - Product name from SDS
 * @param {Array<Object>} params.composition - Chemical composition array
 * @param {string} params.composition[].name - Chemical name
 * @param {string} params.composition[].cas - CAS Registry Number
 * @param {number} params.composition[].percent - Percentage in product
 * @param {boolean} [params.composition[].is_solid] - Physical state flag
 * @param {boolean} [params.composition[].is_liquid] - Physical state flag
 * @param {number} [params.composition[].flash_point_C] - Flash point in Celsius
 * @param {number} [params.composition[].pH] - pH value
 * @param {string|null} params.physicalState - Overall physical state ("solid" | "liquid" | "sludge" | "gas")
 * @param {number|null} params.flashPointC - Overall flash point in Celsius
 * @param {number|null} params.pH - Overall pH value
 * @param {number} [params.density] - Density (optional)
 * @param {string} [params.state="TX"] - State for regulatory compliance (default: Texas)
 * @param {Object} [params.userContext] - User context for audit logging
 * @param {string} [params.userContext.userId="unknown"] - User identifier
 * @param {Function} [params.popupHandler] - UI handler for regulatory prompts
 * @param {Object} [params.push] - Integration toggles
 * @param {boolean} [params.push.labpack=true] - Push to lab pack queue
 * @param {boolean} [params.push.manifest=true] - Push to manifest queue
 * @returns {Promise<Object>} Complete classification result with all regulatory codes
 */
export default async function classifySDS({
  sdsId,
  productName,
  composition = [], // [{name, cas, percent, is_solid?, is_liquid?, flash_point_C?, pH?}]
  physicalState,     // "solid" | "liquid" | "sludge" | "gas" | null
  flashPointC,       // number | null
  pH,                // number | null
  density,           // optional
  state = "TX",
  userContext = { userId: "unknown" },
  popupHandler,      // optional UI handler fn(prompt) => Promise<{answer, meta?}>
  push = { labpack: true, manifest: true }, // toggles
}) {
  // Load datasets
  const datasets = {
    D: await requireJSON(PATHS.D_CODES),
    P: await requireJSON(PATHS.P_CODES),
    U: await requireJSON(PATHS.U_CODES),
    F: await requireJSON(PATHS.F_CODES),
    K: await requireJSON(PATHS.K_CODES),
    CERCLA: await requireJSON(PATHS.CERCLA),
    TSCA: await requireJSON(PATHS.TSCA),
    DOT: await requireJSON(PATHS.DOT_UN),
    TX_RG22: await requireJSON(PATHS.TX_RG22),
    TX_APP_D: await requireJSON(PATHS.TX_APP_D),
    TX_STATE: await requireJSON(PATHS.TX_STATE),
  };

  validateDatasets(datasets); // throws if anything is structurally wrong

  const audit = new AuditLogger({ sdsId, userContext });
  const popup = new PopupManager({ sdsId, userContext, audit });
  if (popupHandler) popup.setHandler(popupHandler);

  const comps = ensureArray(composition);

  // --- Step 1: Federal Characteristics (D001–D043) ---
  const fedChar = await FederalCharacteristicBot.run({
    sdsId,
    composition: comps,
    physicalState,
    flashPointC,
    pH,
    datasets,
    popup,
    audit,
  });

  // --- Step 2: Federal Listed (P/U/F/K) ---
  const fedListed = await FederalListedBot.run({
    sdsId,
    composition: comps,
    datasets,
    audit,
  });

  // --- Step 3: CERCLA / TSCA overlays ---
  const overlays = await CERCLA_TSCABot.run({
    sdsId,
    composition: comps,
    datasets,
    audit,
  });

  // --- Step 4: State logic (TX default) ---
  let stateResult = null;
  if (state === "TX") {
    stateResult = await TexasStateLogicBot.run({
      sdsId,
      composition: comps,
      physicalState,
      pH,
      flashPointC,
      federal: { fedChar, fedListed },
      datasets,
      popup,
      audit,
    });
  }

  // --- Step 5: DOT hinting (non-binding) ---
  const dotHint = await DOTShippingBot.run({
    sdsId,
    composition: comps,
    datasets,
    audit,
  });

  // Final normalized result
  const result = {
    sdsId,
    productName,
    timestamp: nowISO(),
    federal: {
      characteristics: fedChar, // {codes, reasons, popupDecisions, details[]}
      listed: fedListed,        // {P,U,F,K}
      overlays,                 // {cercla, tsca}
    },
    state: {
      jurisdiction: state,
      ...(stateResult ? { tx: stateResult } : {}),
    },
    transport: { dotHint },
    auditTrail: audit.flush(),
  };

  // Downstream pushes
  if (push?.labpack) {
    await pushToLabPack(result).catch(e => audit.log({ type: "PUSH_ERROR", target: "LabPack", error: String(e) }));
  }
  if (push?.manifest) {
    await pushToManifest(result).catch(e => audit.log({ type: "PUSH_ERROR", target: "Manifest", error: String(e) }));
  }

  return result;
}
