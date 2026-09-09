# `templates/base/` — base game

60 JSON template files, 72 l10n files. Always loaded, in every scenario. Read
[`registry.md`](registry.md) first for the merge rules.

Every record has `dataName` (the primary key) unless noted. `friendlyName` /
`displayName` in JSON is a dev label — user-facing text lives in l10n.

## Where to look for a thing

| I need… | File |
|---|---|
| techs and their prereq graph | `TITechTemplate` → `TIProjectTemplate` |
| research costs | `TIProjectTemplate.researchCost`, `TITechTemplate.researchCost` |
| drives / engines | `TIDriveTemplate` (+ `TIPowerPlantTemplate`, `TIRadiatorTemplate`) |
| ships | `TIShipHullTemplate` + weapon files + `TISpaceShipTemplate` (prebuilt designs) |
| nations, unification, claims | `TINationTemplate` + `TIBilateralTemplate` + `TIRegionTemplate` |
| what a project/effect actually does | `TIEffectTemplate` (referenced by `effects` arrays) |
| orbits and bodies | `TISpaceBodyTemplate`, `TIOrbitTemplate`, `TINavigableTemplate` |
| campaign start state | `TIStartTimeTemplate`, `TIMetaTemplate` |
| tuning constants | `TIGlobalConfig` (1 record, ~100 knobs) |

## Earth / nations / politics

| File | Recs | Size | What it holds | Key fields |
|---|---|---|---|---|
| `TINationTemplate` | 884 | 781K | Nations, ISO-coded. Starting stats and IP investment. | `ISOCodes`, `initialGDP`, `cohesion`, `unrest`, `democracy`, `education`, `miltech`, `nuclearWeapons`, `initSpaceIPs`, `unionTrigger`, `unionFlagResource`, `group`, `aggregateNation` |
| `TIRegionTemplate` | 1089 | 1.1M | Regions — population, resources, ancestry weights for name gen. | `mapRegionName`, `primaryCity`, `sortNation`, `population_Millions`, `coreEco`, `mining`, `oilResource`, `boostPerYear_tons`, `missionControl`, `composedOf`, `<anc>Personal/Family/Weight` |
| `TIMapRegionTemplate` | 363 | 107K | Map geometry for regions: terrain, coast, lat/long, area. | `terrain`, `supraRegion`, `coast`, `latitude`, `boostLatitude`, `area_km2`, `island`, `parent` |
| `TIBilateralTemplate` | 8236 | 1.4M | **Pairwise nation relations** — alliances, wars, claims, unification prereqs. No l10n. | `relationType`, `nation1`, `nation2`, `region1`, `federation`, `capitalClaim`, `hostileClaim`, `initialOwner`, `initialColony`, `projectUnlockName` |
| `TIArmyTemplate` | 101 | 22K | Starting armies and where they deploy. | `startRegionStr`, `homeRegionStr`, `armyType`, `deploymentType`, `startingStrength` |
| `TIPriorityPresetTemplate` | 43 | 14K | National-AI investment presets (`*Setting` per priority). | `nationalAIOption`, `factionName`, `economySetting`, `militarySetting`, … |

## Research and effects

| File | Recs | Size | What it holds | Key fields |
|---|---|---|---|---|
| `TITechTemplate` | 149 | 51K | Global tech tree. 2 records tagged `NotPostApoc`. | `techCategory`, `researchCost`, `prereqs`, `effects`, `AI_techRole`, `AI_criticalTech`, `endGameTech`, `scenarioTags` |
| `TIProjectTemplate` | 750 | 435K | Faction projects — the bulk of researchable content. 20 tagged `NotPostApoc`. | `techCategory`, `researchCost`, `prereqs`, `altPrereq0`, `effects`, `resourcesGranted`, `oneTimeGlobally`, `repeatable`, `initialUnlockChance`, `factionPrereq`, `requiresNation`, `orgGranted`, `disable` |
| `TIEffectTemplate` | 719 | 184K | The verbs everything else references from its `effects` array. | `operation`, `value`, `strValue`, `effectTarget`, `effectSecondaryTarget`, `effectDuration`, `duration_months`, `contexts`, `stackable`, `instantEffect` |
| `TIObjectiveTemplate` | 101 | 61K | Faction objective chains and their rewards. | `objectiveType`, `starter`, `unlockingObjectiveNames`, `targetProjectTemplateName`, `targetMilestone`, `resourcesGranted`, `setsWinConditionForFaction` |

## Space: bodies, orbits, habs

| File | Recs | Size | What it holds | Key fields |
|---|---|---|---|---|
| `TISpaceBodyTemplate` | 495 | 534K | Planets, moons, asteroids — orbital elements and physical data. | `objectType`, `barycenterName`, `mass_kg`, `density_gcm3`, `semiMajorAxis_AU`, `eccentricity`, `inclination_Deg`, `orbits`, `habSites`, `effectToExplore`, `maxHabSize` |
| `TIOrbitTemplate` | 919 | 506K | Named orbital shells and Lagrange orbits. Beware spaced keys. | `barycenterName`, `orbitIndex`, `stationCapacity`, `semiMajorAxisRange_km`, `altitude_km`, `interfaceOrbit`, `radialOrbit`, `irradiatedMultiplier` |
| `TINavigableTemplate` | 117 | 38K | Lagrange points and other navigable non-bodies. | `lagrangeValue`, `relatedObject`, `effectToExplore`, `positionCalculator`, `maxHabSize` |
| `TIHabSiteTemplate` | 671 | 173K | Buildable surface sites, with mining profile. | `parentBodyName`, `latitude`, `longitude`, `miningProfileName`, `Density` |
| `TIMiningProfileTemplate` | 31 | 19K | Resource yield distributions (`_mean/_width/_min/_jump` per resource). | `water_*`, `volatiles_*`, `metals_*`, `nobles_*`, `fissiles_*`, `modifyBySize` |
| `TIHabTemplate` | 44 | 52K | Pre-placed stations/bases (ISS, Tiangong, alien HQ). | `habType`, `tier`, `habSite`, `orbitTemplateName`, `sectors`, `alien` |
| `TIHabModuleTemplate` | 156 | 197K | Hab modules — costs, upkeep, income, unlocks. | `habType`, `tier`, `coreModule`, `requiredProjectName`, `crew`, `power`, `baseMass_tons`, `buildTime_Days`, `supportMaterials_month`, `income*_month`, `specialRules`, `upgradesFromName`, `missionControl` |
| `TIHabSchematicTemplate` | 8 | 5K | AI hab build recipes. | `relativeValue`, `decisions`, `preferences` |

## Ships and weapons

| File | Recs | Size | What it holds | Key fields |
|---|---|---|---|---|
| `TIDriveTemplate` | 541 | 408K | Every drive variant. Note the unsanitised key `req power`. | `driveClassification`, `thrusters`, `requiredProjectName`, `thrust_N`, `EV_kps`, `specificPower_kgMW`, `efficiency`, `thrustRating_GW`, `req power`, `flatMass_tons`, `requiredPowerPlant`, `propellant`, `cooling`, `freeISRU`, `helium3Fuel` |
| `TIPowerPlantTemplate` | 61 | 32K | Reactors. | `maxOutput_GW`, `specificPower_tGW`, `powerPlantClass`, `efficiency`, `crew` |
| `TIRadiatorTemplate` | 13 | 7K | Heat rejection. | `specificMass_2s_kgm2`, `specificPower_2s_KWkg`, `operatingTemp_K`, `emissivity`, `vulnerability`, `radiatorType` |
| `TIHeatSinkTemplate` | 14 | 5K | Heat sinks. | `heatCapacity_GJ`, `mass_tons` |
| `TIBatteryTemplate` | 10 | 5K | Batteries. | `energyCapacity_GJ`, `rechargeRate_GJs`, `hp` |
| `TIShipHullTemplate` | 28 | 80K | Hulls and their slot layout. | `noseHardpoints`, `hullHardpoints`, `internalModules`, `consTier`, `mass_tons`, `structuralIntegrity`, `crew`, `maxOfficers`, `shipModuleSlots`, `baseConstructionTime_days` |
| `TIShipArmorTemplate` | 12 | 9K | Armor materials. | `xRayHalfValue_cm`, `baryonicHalfValue_cm`, `density_kgm3`, `heatofVaporization_MJkg`, `specialties` |
| `TIUtilityModuleTemplate` | 58 | 30K | Non-weapon ship modules. | `mass_tons`, `minConsTier`, `powerRequirement_MW`, `specialModuleRules`, `specialModuleValue` |
| `TILaserWeaponTemplate` | 125 | 107K | Lasers. | `shotPower_MJ`, `wavelength_nm`, `mirrorRadius_cm`, `beam_quality`, `jitter_Rad`, `targetingRange_km` |
| `TIMagneticGunTemplate` | 70 | 86K | Railguns / coilguns. | `muzzleVelocity_kps`, `warheadMass_kg`, `magazine`, `salvo_shots`, `flatChipping` |
| `TIMissileTemplate` | 57 | 82K | Missiles. | `warheadClass`, `deltaV_kps`, `acceleration_g`, `EV_kps`, `flatDamage_MJ`, `rotation_degps`, `shapedChargeAngle` |
| `TIParticleWeaponTemplate` | 33 | 35K | Particle beams. | `shotPower_MJ`, `xRayFraction`, `baryonFraction`, `lensRadius_cm`, `dispersionModel`, `emittance_mrad` |
| `TIPlasmaWeaponTemplate` | 16 | 19K | Plasma guns. | `chargingEnergy_GJ`, `muzzleVelocity_kps`, `expectedDamage_MJ` |
| `TIGunTemplate` | 8 | 10K | Conventional autocannon (mostly aircraft/legacy). | `damage_MJ`, `salvo_shots`, `bombardmentValue` |
| `TISpaceShipTemplate` | 46 | 94K | Prebuilt ship designs (alien + skirmish). **dirty JSON** | `hullName`, `driveName`, `powerPlantName`, `radiatorName`, `propellantTanks`, `*Armor`, `*WeaponTemplateEntries` |
| `TISpaceFleetTemplate` | 35 | 18K | Prebuilt fleets. **dirty JSON** | `factionName`, `shipsInFleet`, `formationName`, `orbitTemplateName` |
| `TIFormationTemplate` | 23 | 24K | Combat formation patterns. | `pos`, `patternShift`, `AICombatBaseWeight`, `AIMaximumAllowedShips` |
| `TISpaceCombatTemplate` | 1 | <1K | Skirmish setup. | `fleetNames` |

## Council, factions, characters

| File | Recs | Size | What it holds | Key fields |
|---|---|---|---|---|
| `TIFactionTemplate` | 8 | 47K | The 7 human factions + aliens. Big: colors, icons, AI values, start resources. | `ideologyName`, `victoryTemplateName`, `winningOrg`, `startingResources`, `AIValues`, `firstTechNames`, `habPreferences`, `hullIndex_*` |
| `TIFactionIdeologyTemplate` | 10 | 3K | Ideology axes. | `ideology`, `ideologyCoordinates`, `willProxy`, `willAppease` |
| `TIPlayerTemplate` | 8 | 1K | Player↔council binding. **dirty JSON** | `council` |
| `TICouncilorTypeTemplate` | 26 | 23K | Councilor classes and their stat rolls. | `base*`/`rand*` per stat, `keyStat`, `affinities`, `antiAffinities`, `missionNames`, `weight` |
| `TICouncilorTemplate` | 46 | 28K | Pregenerated and randomized councilors. | `randomized`, `alien`, `traits`, `type`, `regionBorn`, `yearBorn`, `allowedIdeologies` |
| `TITraitTemplate` | 157 | 252K | Councilor traits. | `statMods`, `techBonuses`, `priorityBonuses`, `baseChance`, `classChance`, `XPCost`, `upgradesFrom`, `missionsGrantedNames`, `specialTraitRule`, `tags` |
| `TIMissionTemplate` | 50 | 112K | Councilor missions. | `baseMission`, `conditions`, `attackerContexts`, `defenderContexts`, `targetEffects`, `councilorEffects`, `noise`, `hate`, `XPonSuccess`, `resolutionMethod` |
| `TIOrgTemplate` | 381 | 316K | Orgs. Every stat comes as `chanceX`/`X`/`randX`. | `orgType`, `tier`, `homeRegionMapTemplateName`, `cost*`, `income*`, `chance*`/`rand*` stat trio, `requiredOwnerTraits`, `requiredTechName`, `missionsGrantedNames`, `minScenarioYear` |
| `TIOfficerTemplate` | 15 | 16K | Ship officers. | `spawnChance`, `requirements`, `effects` |
| `TICouncilorAppearanceTemplate` | 258 | 157K | Portraits/videos and who may use them. | `allowedGenders`, `allowedAncestries`, `allowedJobNames`, `portrait*`, `idleVideo*` |
| `TICouncilorVoiceTemplate` | 50 | 9K | VO sets. | `voiceActor`, `language`, `accent`, `gender` |

## Campaign, scenarios, UI

| File | Recs | Size | What it holds | Key fields |
|---|---|---|---|---|
| `TIMetaTemplate` | 72 | 88K | **Scenario manifests** — which records each scenario loads. **dirty JSON** | `templateType`, `templateNames`, `scenarioTags`, `scenarioPrefix`, `scenarioLocalizationPostfix`, `isNewCampaignOption` |
| `TIStartTimeTemplate` | 5 | 9K | Start dates and starting bonuses/climate. | `year`, `bonus*`, `initialAtmospheric*`, `startingTechs`, `projectsCompleted`, `initialCrashdownRegionTemplateName` |
| `TIGlobalConfig` | 1 | 5K | ~100 global tuning knobs + debug flags. **dirty JSON** | `globalResearchMultiplier`, `priority_*`, `nationalInvestment*`, `missionDifficultyModifier`, `debug_*` |
| `TIVictoryTemplate` | 7 | 3K | Win conditions. | `victoryConditions`, `victoryEffect` |
| `TINarrativeEventTemplate` | 260 | 1.7M | Random/triggered events with option trees. Largest file in the repo. | `baseWeight`, `monthlyWeightDelta`, `targetType`, `targetConditions`, `targetWeightModifiers`, `eventOptions`, `reqTechDataName`, `*_cooldown_months`, `repeatable` |
| `TITimeEventTemplate` | 4 | 1K | Clock tick handlers. **dirty JSON** | `eventType`, `pauseTime`, `stopClock` |
| `TINotificationTemplate` | 175 | 79K | Alert/news routing rules. | `alertAudience`, `newsFeedAudience`, `stacking`, `unlockingObjectives` |
| `TICodexEntryTemplate` | 115 | 18K | In-game codex. | `mainTopic`, `index`, `locPath`, `unlockTech`, `templateToPull` |
| `TI2DCinematicTemplate` | 22 | 13K | Cinematic text timing. | `textSequences`, `textTimeStamp1..20` |
| `TIMapGroupVisualizerTemplate` | 7 | 2K | Map icon grouping. **dirty JSON** | `mapGroupControlType`, `groupScale` |
| `TIOrgIconTemplate` | 550 | 112K | Org icon pool. | `path`, `minTier`, `maxTier`, `primaryOrgType`, `firstLetters` |
| `TILocalizationTemplate` | 17 | 4K | Supported languages. | `active`, `core`, `bodyTextFontPath`, `nameListOffset` |

## l10n (`base/l10n/*.en`, 72 files)

Template strings, keyed `TIxTemplate.<field>.<dataName>=`. Biggest:
`TINarrativeEventTemplate` (3684), `TISpaceBodyTemplate` (2814), `TIRegionTemplate` (2270),
`TIProjectTemplate` (1568, fields `displayName`/`summary`/`description`),
`TINationTemplate` (1371), `TIEffectTemplate` (1132), `TIObjectiveTemplate` (1034),
`TIOrbitTemplate` (920), `TITechTemplate` (830), `TIArmyTemplate` (730).

**No l10n file** for `TIBilateralTemplate`, `TIGlobalConfig`, `TIStartTimeTemplate`,
`TIMapRegionTemplate`, `TIOrgIconTemplate` and other internal-only types — absence means those
records have no user-facing name.

**l10n files with no matching Templates file** (strings only): `TICinematicsTemplate`,
`TICondition`, `TIOperationTemplate`, `TIPolicyTemplate`, `TIResourceCost`,
`TIShipCommandTemplate`.

UI strings live in 22 `UI*.en` files, keyed `UI.<Screen>.<key>=`. Biggest: `UIStartScreen`
(1591), `UIObjectives` (1072), `UINotifications` (898), `UINation` (636), `UICodex` (424).
