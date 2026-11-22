// Vite bundles these as hashed URLs and (for raster formats) can apply
// further build-time optimisation via plugins if the project adds one later.
import doctorHallway from "../../../assets/landing/photo-doctor-hallway-portrait.webp";
import cliniciansTablet from "../../../assets/landing/photo-clinicians-hallway-tablet.webp";
import receptionDesk from "../../../assets/landing/photo-reception-desk-scene.webp";
import meetingRoom from "../../../assets/landing/photo-meeting-room-team.webp";
import nursePhone from "../../../assets/landing/photo-nurse-phone-hallway.webp";
import communityMeeting from "../../../assets/landing/photo-community-meeting-audience.webp";
import africaNetworkMap from "../../../assets/landing/graphic-africa-network-map.webp";

import africaNetwork from "../../../assets/landing/brand-africa-network.webp";
import doctorElderGreen from "../../../assets/landing/brand-doctor-elder-green.webp";
import handHeartUi from "../../../assets/landing/brand-hand-heart-ui.webp";
import capeTown from "../../../assets/landing/brand-cape-town.webp";
import crossAbstract from "../../../assets/landing/brand-cross-abstract.webp";
import globeHand from "../../../assets/landing/brand-globe-hand.webp";
import womanBedSmile from "../../../assets/landing/brand-woman-bed-smile.webp";
import doctorTablet from "../../../assets/landing/brand-doctor-tablet.webp";
import blocksNetwork from "../../../assets/landing/brand-blocks-network.webp";
import holdingHands from "../../../assets/landing/brand-holding-hands.webp";
import globeAfrica from "../../../assets/landing/brand-globe-africa.webp";
import doctorElderSmile from "../../../assets/landing/brand-doctor-elder-smile.webp";
import touchIcons from "../../../assets/landing/brand-touch-icons.webp";
import handsDoctor from "../../../assets/landing/brand-hands-doctor.webp";
import johannesburg from "../../../assets/landing/brand-johannesburg.webp";
import globeCrossHand from "../../../assets/landing/brand-globe-cross-hand.webp";
import doctorElderScarf from "../../../assets/landing/brand-doctor-elder-scarf.webp";
import bodyUi from "../../../assets/landing/brand-body-ui.webp";
import clinicLobby from "../../../assets/landing/brand-clinic-lobby.webp";
import doctorPatientBed from "../../../assets/landing/brand-doctor-patient-bed.webp";
import hexIcons from "../../../assets/landing/brand-hex-icons.webp";
import hospitalBuilding from "../../../assets/landing/brand-hospital-building.webp";
import womanLookingUp from "../../../assets/landing/brand-woman-looking-up.webp";
import leafDrops from "../../../assets/landing/brand-leaf-drops.webp";

import tileIconReferral from "../../../assets/landing/tile-icon-referral.png";
import tileIconIdentity from "../../../assets/landing/tile-icon-identity.png";
import tileIconTrust from "../../../assets/landing/tile-icon-trust.png";
import tileIconCare from "../../../assets/landing/tile-icon-care.png";
import tileIconReach from "../../../assets/landing/tile-icon-reach.png";

import iconPerson from "../../../assets/landing/icon-person.png";
import iconHospital from "../../../assets/landing/icon-hospital.png";
import iconNetworkHub from "../../../assets/landing/icon-network-hub.png";
import iconWifiShield from "../../../assets/landing/icon-wifi-shield.png";
import iconDeviceSecurity from "../../../assets/landing/icon-device-security.png";

export interface LandingImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export const landingImages = {
  heroFallback: { src: doctorHallway, width: 1242, height: 756, alt: "Doctor walking through a hospital corridor holding a patient folder" } satisfies LandingImage,
  referralStage: { src: cliniciansTablet, width: 2432, height: 608, alt: "Clinician reviewing a referral on a tablet in a hospital hallway" } satisfies LandingImage,
  intakeStage: { src: receptionDesk, width: 730, height: 1293, alt: "Patient checking in at a hospital reception desk" } satisfies LandingImage,
  careStage: { src: meetingRoom, width: 1256, height: 1024, alt: "Care team reviewing a patient case together around a table" } satisfies LandingImage,
  followUpStage: { src: nursePhone, width: 1242, height: 756, alt: "Nurse following up with a patient by phone in a hospital hallway" } satisfies LandingImage,
  community: { src: communityMeeting, width: 1242, height: 756, alt: "Community health outreach meeting with local residents" } satisfies LandingImage,
  africaNetwork: { src: africaNetworkMap, width: 1094, height: 1024, alt: "Illustration of a connected health data network across the African continent" } satisfies LandingImage,
};

/** Brand photography supplied for the CLANCLAST site (cropped from the Connected Care collages). */
export const brandPhotos = {
  africaNetwork: { src: africaNetwork, width: 860, height: 495, alt: "Glowing network of connections across the African continent" } satisfies LandingImage,
  doctorElderGreen: { src: doctorElderGreen, width: 712, height: 545, alt: "Doctor smiling warmly with an elderly patient in green" } satisfies LandingImage,
  handHeartUi: { src: handHeartUi, width: 548, height: 375, alt: "Hand touching a glowing heart-rate health interface" } satisfies LandingImage,
  capeTown: { src: capeTown, width: 570, height: 368, alt: "Cape Town and Table Mountain at sunrise" } satisfies LandingImage,
  crossAbstract: { src: crossAbstract, width: 500, height: 371, alt: "Abstract green medical cross" } satisfies LandingImage,
  globeHand: { src: globeHand, width: 816, height: 628, alt: "Open hand holding a glowing globe linked to health icons" } satisfies LandingImage,
  womanBedSmile: { src: womanBedSmile, width: 815, height: 318, alt: "Patient smiling hopefully from her hospital bed" } satisfies LandingImage,
  doctorTablet: { src: doctorTablet, width: 815, height: 298, alt: "Doctor using a tablet with secure health records icons" } satisfies LandingImage,
  blocksNetwork: { src: blocksNetwork, width: 816, height: 274, alt: "Connected blocks representing hospital, doctor, laboratory and care" } satisfies LandingImage,
  holdingHands: { src: holdingHands, width: 815, height: 270, alt: "A caregiver holding a patient's hands" } satisfies LandingImage,
  globeAfrica: { src: globeAfrica, width: 826, height: 462, alt: "Glowing globe centred on Africa with connection lines" } satisfies LandingImage,
  doctorElderSmile: { src: doctorElderSmile, width: 830, height: 462, alt: "Doctor and older patient sharing a smile" } satisfies LandingImage,
  touchIcons: { src: touchIcons, width: 550, height: 461, alt: "Finger touching a glowing medical interface" } satisfies LandingImage,
  handsDoctor: { src: handsDoctor, width: 540, height: 461, alt: "Doctor's hands comforting a patient's hand" } satisfies LandingImage,
  johannesburg: { src: johannesburg, width: 550, height: 461, alt: "Johannesburg skyline with a glowing heartbeat line" } satisfies LandingImage,
  globeCrossHand: { src: globeCrossHand, width: 765, height: 941, alt: "Hand holding a globe with a medical cross" } satisfies LandingImage,
  doctorElderScarf: { src: doctorElderScarf, width: 890, height: 470, alt: "Doctor smiling with an elderly woman patient" } satisfies LandingImage,
  bodyUi: { src: bodyUi, width: 446, height: 455, alt: "Hand pointing at a holographic body and health data" } satisfies LandingImage,
  clinicLobby: { src: clinicLobby, width: 429, height: 455, alt: "Calm bright clinic lobby with a staff member walking" } satisfies LandingImage,
  doctorPatientBed: { src: doctorPatientBed, width: 885, height: 645, alt: "Doctor smiling at a patient resting in a hospital bed" } satisfies LandingImage,
  hexIcons: { src: hexIcons, width: 767, height: 258, alt: "Hand touching hexagonal health icons" } satisfies LandingImage,
  hospitalBuilding: { src: hospitalBuilding, width: 618, height: 283, alt: "Modern glass hospital building at sunset" } satisfies LandingImage,
  womanLookingUp: { src: womanLookingUp, width: 442, height: 281, alt: "Woman looking up with a hopeful smile" } satisfies LandingImage,
  leafDrops: { src: leafDrops, width: 590, height: 261, alt: "Green leaf with water droplets" } satisfies LandingImage,
};

export const journeyIcons = {
  person: { src: iconPerson, width: 141, height: 156, alt: "" },
  hospital: { src: iconHospital, width: 226, height: 137, alt: "" },
  networkHub: { src: iconNetworkHub, width: 227, height: 264, alt: "" },
  wifiShield: { src: iconWifiShield, width: 162, height: 203, alt: "" },
  deviceSecurity: { src: iconDeviceSecurity, width: 286, height: 287, alt: "" },
};

/** White, transparent-background icons (recoloured from the original journey icons) for the platform photo tiles. */
export const tileIcons = {
  referral: tileIconReferral,
  identity: tileIconIdentity,
  trust: tileIconTrust,
  care: tileIconCare,
  reach: tileIconReach,
};
