import assert from "node:assert/strict";
import { createStepPerformerModel } from "../shared/stepModel.js";
import { hasPerformerStepContent } from "../frontend/src/lib/stepContent.js";
import { buildSummaryLine } from "../frontend/src/lib/performers.js";

function run() {
  const movement = createStepPerformerModel({
    role: "movement",
    attackMove: "lunge · forward",
  });
  assert.equal(movement.role, "movement");
  assert.equal(hasPerformerStepContent(movement), true);
  assert.match(buildSummaryLine(movement), /déplacement/i);

  const legacyPreparation = createStepPerformerModel({
    role: "preparation",
    attackMove: "pass · forward",
  });
  assert.equal(legacyPreparation.role, "movement");
  assert.equal(hasPerformerStepContent(legacyPreparation), true);

  const attack = createStepPerformerModel({
    role: "attack",
    offensive: "thrust",
    target: "zone_head",
  });
  assert.equal(hasPerformerStepContent(attack), true);

  const defense = createStepPerformerModel({
    role: "defense",
    defenseDetails: [{ defense: "parry", position: "position_4", attribute: "" }],
  });
  assert.equal(hasPerformerStepContent(defense), true);

  const note = createStepPerformerModel({
    mode: "note",
    role: "none",
    note: "note libre",
  });
  assert.equal(hasPerformerStepContent(note), true);

  const empty = createStepPerformerModel();
  assert.equal(hasPerformerStepContent(empty), false);

  const linkedPreparationAttack = createStepPerformerModel({
    role: "attack",
    preparationAction: "feint",
  });
  assert.equal(hasPerformerStepContent(linkedPreparationAttack), true);

  console.log("[ok] step flow checks passed");
}

run();

