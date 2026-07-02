import { writeFileSync } from 'fs'
import { randomUUID } from 'crypto'

const id = () => randomUUID().slice(0, 8)

// Track template
function track(name, color, steps) {
  return { id: id(), name, steps, volume: 0.8, mute: false, color }
}

const COLORS = ['#e74c3c','#3498db','#2ecc71','#e67e22','#9b59b6','#1abc9c','#e91e63','#f39c12','#16a085','#c0392b']
const NAMES = ['Kick','Snare','Hi-Hat','Clap','Hi Tom','Mid Tom','Floor Tom','Ride','Crash','Cowbell']

function makeBeat(bpm, patterns) {
  return {
    bpm,
    // Always produce 10 tracks; pad missing ones with silence
    tracks: NAMES.map((name, i) => track(name, COLORS[i], patterns[i] || Array(16).fill(false)))
  }
}

function b(str) {
  // '1' = true, '0' = false, 16 chars
  return str.split('').map(c => c === '1')
}

// Note helper
function note(pitch, startStep, duration) {
  return { id: id(), pitch, startStep, duration }
}

// ── BEATS ──────────────────────────────────────────────────
const beats = {
  'classic-hiphop.json': makeBeat(90, [
    b('1000000010000000'), // kick
    b('0000100000001000'), // snare
    b('1010101010101010'), // hihat
    b('0000000000000000'), // clap
    b('0000000000000000'), // hi tom
    b('0000000000000000'), // mid tom
    b('0000000000000000'), // floor tom
    b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'trap-banger.json': makeBeat(140, [
    b('1000000010000000'),
    b('0000100000001000'),
    b('1110101011101010'), // trap hihat rolls
    b('0000100000001000'),
    b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'boom-bap.json': makeBeat(95, [
    b('1000100010001000'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'lofi-chill.json': makeBeat(75, [
    b('1000000010000000'),
    b('0000100000001000'),
    b('0101010101010101'),
    b('0000000000000000'), b('0000000000000000'), b('0100010001000100'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'rock-anthem.json': makeBeat(130, [
    b('1000100010001000'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000000000000000'), // clap
    b('0010000000000000'), // hi tom fill
    b('0000010000000000'), // mid tom fill
    b('0000000100000001'), // floor tom fill
    b('0001000000010000'), b('0000000000000001'), b('0000000000000000'),
  ]),
  'punk-fury.json': makeBeat(160, [
    b('1000100010001000'),
    b('0000100000001000'),
    b('1111111111111111'),
    b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'jazz-swing.json': makeBeat(110, [
    b('1000001000000010'),
    b('0000100000001000'),
    b('1010010010100100'),
    b('0000000000000000'), b('0000000000000000'), b('1001001010010010'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'funky-drummer.json': makeBeat(105, [
    b('1000001010001000'),
    b('0000100000001010'),
    b('1110101111101011'),
    b('0000000000000000'), b('0010000000100000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'salsa-fire.json': makeBeat(175, [
    b('1000100110001001'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000000000000000'), b('0010001000100010'), b('0000000000000000'), b('0000000000000000'), b('1000100010001000'),
  ]),
  'bossa-nova.json': makeBeat(120, [
    b('1001001010010010'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000000000000000'), b('0000000000000000'), b('1001001010010010'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'afrobeat-groove.json': makeBeat(110, [
    b('1000100110001001'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000000000000000'), b('0010001000100010'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'reggae-one-drop.json': makeBeat(75, [
    b('0000100000001000'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000000000000000'), b('0000000000000000'), b('1000000010000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'dancehall-riddim.json': makeBeat(95, [
    b('1000000010000000'),
    b('0001000100010001'),
    b('1010101010101010'),
    b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'drum-and-bass.json': makeBeat(174, [
    b('1000001010001000'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000000000000000'), b('0000100000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'house-classic.json': makeBeat(128, [
    b('1000100010001000'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000100000001000'), b('0000000000000000'), b('0010000000100000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'techno-drive.json': makeBeat(140, [
    b('1000100010001000'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000000000000000'), b('0000000000000000'), b('0100010001000100'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'breakbeat.json': makeBeat(125, [
    b('1000001010000010'),
    b('0000100001001000'),
    b('1111010111110101'),
    b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'gospel-groove.json': makeBeat(90, [
    b('1000001010001000'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000100000001000'), b('0000000000000000'), b('0001000000010000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'rnb-smooth.json': makeBeat(85, [
    b('1000000110000001'),
    b('0000100000001000'),
    b('0110011001100110'),
    b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'pop-pulse.json': makeBeat(120, [
    b('1000100010001000'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000100000001000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'samba.json': makeBeat(130, [
    b('1010001010100010'),
    b('0001000100010001'),
    b('1111111111111111'),
    b('0000000000000000'), b('1000100010001000'), b('0100010001000100'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'cumbia-beat.json': makeBeat(120, [
    b('1000100110001001'),
    b('0000100000001000'),
    b('0101010101010101'),
    b('0000000000000000'), b('0010001000100010'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'trap-hihat-roll.json': makeBeat(150, [
    b('1000000010000000'),
    b('0000100000001000'),
    b('1111111111111111'),
    b('0000100000001000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'motown-groove.json': makeBeat(110, [
    b('1000001000100010'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000000000000000'), b('0010000000100000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'heavy-metal.json': makeBeat(180, [
    b('1000000010000000'),
    b('0000100000001000'),
    b('1111111111111111'),
    b('0000000000000000'), b('0000100000000000'), b('0000000000000000'), b('1000000000000000'), b('0000000000000000'),
  ]),
  'minimal-techno.json': makeBeat(132, [
    b('1000100010001000'),
    b('0000000000000000'),
    b('0010001000100010'),
    b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'deep-house.json': makeBeat(122, [
    b('1000000010000001'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000000000000000'), b('0000000000000000'), b('0100000001000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'afro-house.json': makeBeat(124, [
    b('1000100010001001'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000000000000000'), b('0010001000100010'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'jungle.json': makeBeat(165, [
    b('1000001010001000'),
    b('0000100001001010'),
    b('1110101110101110'),
    b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'lofi-jazz.json': makeBeat(68, [
    b('1000000010000000'),
    b('0000100000001000'),
    b('1001001010010010'),
    b('0000000000000000'), b('0000000000000000'), b('1001001010010010'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'cumbia-electronica.json': makeBeat(115, [
    b('1000100110001001'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000100000001000'), b('0010001000100010'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'hiphop-shuffle.json': makeBeat(88, [
    b('1000100010001000'),
    b('0000100000001000'),
    b('1010010110100101'),
    b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'jazz-waltz.json': makeBeat(100, [
    b('1000000010000000'),
    b('0000100000001000'),
    b('1001001001001001'),
    b('0000000000000000'), b('0000000000000000'), b('1001001001001001'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'funk-breakbeat.json': makeBeat(112, [
    b('1000001010001010'),
    b('0000100001001000'),
    b('1110101011101010'),
    b('0000000000000000'), b('0010000000100000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'gospel-stomp.json': makeBeat(95, [
    b('1000100010001000'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000100000001000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'afrobeat-highlife.json': makeBeat(105, [
    b('1001001010010010'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000000000000000'), b('0010001000100010'), b('1001001010010010'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'reggaeton.json': makeBeat(95, [
    b('1000100010001000'),
    b('0010001000100010'),
    b('1010101010101010'),
    b('0010001000100010'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'garage-uk.json': makeBeat(130, [
    b('1000001010001010'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000100000001000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'boom-bap-shuffle.json': makeBeat(88, [
    b('1000100010001000'),
    b('0000100000001000'),
    b('1001011001010110'),
    b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'nu-metal.json': makeBeat(120, [
    b('1000100010001000'),
    b('0000100000001000'),
    b('1111000011110000'),
    b('0000000000000000'), b('0000100000001000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'trap-bounce.json': makeBeat(135, [
    b('1000001010001000'),
    b('0000100000001000'),
    b('1010111010101110'),
    b('0000100000001000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'latin-jazz.json': makeBeat(130, [
    b('1001001010010010'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000000000000000'), b('0010001000100010'), b('1001001010010010'), b('0000000000000000'), b('1000100010001000'),
  ]),
  'pop-disco.json': makeBeat(118, [
    b('1000100010001000'),
    b('0000100000001000'),
    b('1111111111111111'),
    b('0000100000001000'), b('0000000000000000'), b('0010000000100000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'idm-glitch.json': makeBeat(138, [
    b('1001010110010101'),
    b('0100001000010010'),
    b('1110110011101100'),
    b('0000100000000100'), b('0000000000100000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'breakcore.json': makeBeat(170, [
    b('1010101110101011'),
    b('0001000100110001'),
    b('1111111111111111'),
    b('0000000100000001'), b('0010000000100000'), b('0000000000000000'), b('0000000000000001'), b('0000000000000000'),
  ]),
  'drum-circle.json': makeBeat(100, [
    b('1000100010001000'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0010001000100010'), b('0100010001000100'), b('0001000100010001'), b('0000000000000000'), b('1000000010000000'),
  ]),
  'second-line.json': makeBeat(108, [
    b('1000100110001001'),
    b('0000100001001010'),
    b('1010101010101010'),
    b('0000000100000001'), b('0010000100100001'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  '80s-synthpop.json': makeBeat(115, [
    b('1000100010001000'),
    b('0000100000001000'),
    b('1010101010101010'),
    b('0000100000001000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'trap-soul.json': makeBeat(130, [
    b('1000000010000001'),
    b('0000100000001000'),
    b('0110011001100110'),
    b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
  'soca.json': makeBeat(155, [
    b('1000100010001000'),
    b('0010001000100010'),
    b('1111111111111111'),
    b('0000100000001000'), b('1000100010001000'), b('0000000000000000'), b('0000000000000000'), b('0000000000000000'),
  ]),
}

// ── LICKS ──────────────────────────────────────────────────

function lick(bpm, notes) { return { bpm, notes } }

const licks = {
  // BLUES — call & response, bent notes (Eb/Bb), rhythmic gaps
  'blues-shuffle.json': lick(90, [
    note('A3',0,1),note('C4',1,1),note('D4',2,1),note('Eb4',3,1),
    note('E4',4,2),note('G4',6,1),note('A4',7,1),
    note('A4',9,1),note('G4',10,1),note('E4',11,1),note('D4',12,1),
    note('C4',13,1),note('A3',15,2),
  ]),
  '12-bar-blues.json': lick(80, [
    // Turnaround lick with chromatic walk
    note('A4',0,1),note('G#4',1,1),note('G4',2,1),note('F#4',3,1),
    note('F4',4,1),note('E4',5,2),note('D4',7,1),
    note('E4',8,1),note('G4',9,1),note('A4',10,1),note('C5',11,1),
    note('B4',12,1),note('A4',13,1),note('G4',14,1),note('E4',15,2),
  ]),
  'pentatonic-blues.json': lick(100, [
    note('A4',0,1),note('A4',1,1),note('C5',2,1),note('A4',3,1),
    note('G4',4,2),note('E4',6,1),note('D4',7,1),
    note('E4',8,1),note('G4',9,1),note('A4',10,1),note('C5',11,1),
    note('Eb5',12,1),note('D5',13,1),note('C5',14,1),note('A4',15,3),
  ]),

  // JAZZ — bebop, chromatic, rhythmically displaced
  'jazz-bebop.json': lick(160, [
    note('C5',0,1),note('Eb5',1,1),note('D5',2,1),note('B4',3,1),
    note('Bb4',4,1),note('G4',5,1),note('Ab4',6,1),note('F4',7,1),
    note('E4',8,1),note('C4',9,1),note('D4',10,1),note('F4',11,1),
    note('E4',12,2),note('G4',14,1),note('B4',15,1),
  ]),
  'jazz-minor.json': lick(110, [
    // Dorian ascending then chromatic descent
    note('D4',0,1),note('E4',1,1),note('F4',2,1),note('G4',3,1),
    note('A4',4,1),note('B4',5,1),note('C5',6,1),note('D5',7,2),
    note('C#5',9,1),note('C5',10,1),note('B4',11,1),note('Bb4',12,1),
    note('A4',13,1),note('G4',14,1),note('F4',15,2),
  ]),
  'modal-jazz.json': lick(120, [
    // Suspended, floating phrase with 4ths
    note('D4',0,2),note('G4',2,1),note('A4',3,2),note('D5',5,1),
    note('C5',6,2),note('G4',8,1),note('A4',9,1),
    note('F4',11,1),note('E4',12,2),note('D4',14,3),
  ]),
  'jazz-autumn-leaves.json': lick(140, [
    // ii-V-I chromatic approaches
    note('A4',0,1),note('Ab4',1,1),note('G4',2,1),note('F#4',3,1),
    note('D4',4,2),note('F4',6,1),note('G4',7,1),
    note('G4',8,1),note('F#4',9,1),note('F4',10,1),note('E4',11,1),
    note('C4',12,4),
  ]),

  // CLASSICAL — sequences, ornaments, contrary motion
  'bach-fragment.json': lick(100, [
    // Two-voice counterpoint implied via rapid alternation
    note('C5',0,1),note('G4',1,1),note('E5',2,1),note('C5',3,1),
    note('D5',4,1),note('G4',5,1),note('F5',6,1),note('D5',7,1),
    note('E5',8,1),note('C5',9,1),note('G4',10,1),note('E4',11,1),
    note('F4',12,1),note('A4',13,1),note('C5',14,1),note('F5',15,2),
  ]),
  'minuet-phrase.json': lick(90, [
    note('G5',0,2),note('F#5',2,1),note('E5',3,1),note('D5',4,2),note('C5',6,2),
    note('B4',8,1),note('A4',9,1),note('G4',10,1),note('F#4',11,1),
    note('G4',12,4),note('D5',16,2),note('C5',18,1),note('B4',19,1),
    note('A4',20,2),note('G4',22,2),note('D4',24,4),
  ]),
  'impressionist.json': lick(80, [
    // Whole-tone scale shimmer
    note('C4',0,3),note('E4',3,1),note('F#4',4,2),note('Ab4',6,2),
    note('Bb4',8,2),note('C5',10,1),note('D5',11,1),
    note('E5',12,3),note('C5',15,1),note('Ab4',16,4),
  ]),

  // ROCK
  'classic-rock-riff.json': lick(130, [
    note('E3',0,1),note('G3',1,1),note('A3',2,2),note('G3',4,1),note('E3',5,1),
    note('D3',6,1),note('E3',7,1),note('G3',8,2),note('A3',10,1),note('B3',11,1),
    note('A3',12,1),note('G3',13,1),note('E3',14,2),
  ]),
  'power-chord-melody.json': lick(140, [
    note('E4',0,1),note('E4',1,1),note('G4',2,2),note('G4',4,1),
    note('A4',5,2),note('G4',7,1),note('E4',8,2),
    note('D4',10,1),note('E4',11,1),note('G4',12,1),note('A4',13,1),
    note('B4',14,2),
  ]),

  // FUNK — syncopation, ghost notes (dur=1), octave jumps
  'funk-groove-lick.json': lick(105, [
    note('G4',0,1),note('G3',1,1),note('Bb4',2,1),note('G4',3,1),
    note('C4',4,2),note('G4',6,1),note('G4',7,1),
    note('Bb4',8,1),note('G4',9,1),note('D4',10,1),note('G4',11,1),
    note('C5',12,2),note('Bb4',14,1),note('G4',15,1),
  ]),
  'disco-octave.json': lick(120, [
    note('C4',0,1),note('C5',1,1),note('E4',2,1),note('E5',3,1),
    note('G4',4,1),note('G5',5,1),note('E4',6,1),note('E5',7,1),
    note('F4',8,1),note('F5',9,1),note('A4',10,1),note('A5',11,1),
    note('G4',12,1),note('G5',13,1),note('C4',14,2),
  ]),

  // R&B / NEO-SOUL
  'rnb-soul-phrase.json': lick(85, [
    note('D4',0,2),note('F4',2,1),note('G4',3,1),
    note('A4',4,1),note('Bb4',5,1),note('A4',6,1),note('G4',7,1),
    note('F4',8,2),note('Eb4',10,1),note('D4',11,1),
    note('C4',12,3),note('D4',15,1),
  ]),
  'rnb-minor-lick.json': lick(92, [
    note('A4',0,1),note('G4',1,1),note('F4',2,1),note('Eb4',3,1),
    note('D4',4,2),note('F4',6,1),note('Ab4',7,1),
    note('Bb4',8,1),note('Ab4',9,1),note('G4',10,1),note('F4',11,1),
    note('Eb4',12,2),note('D4',14,2),
  ]),
  'neo-soul-lick.json': lick(88, [
    note('G4',0,1),note('Bb4',1,1),note('C5',2,1),note('D5',3,1),
    note('Eb5',4,1),note('D5',5,1),note('C5',6,1),note('Bb4',7,1),
    note('G4',8,2),note('F4',10,1),note('G4',11,1),
    note('Eb4',12,4),
  ]),

  // POP
  'pop-hook.json': lick(120, [
    note('C4',0,2),note('E4',2,1),note('G4',3,1),
    note('A4',4,2),note('G4',6,1),note('E4',7,1),
    note('D4',8,2),note('F4',10,1),note('A4',11,1),
    note('G4',12,4),
  ]),
  'sad-pop-melody.json': lick(75, [
    note('A4',0,3),note('G4',3,1),note('F4',4,2),note('E4',6,2),
    note('D4',8,4),note('E4',12,2),note('F4',14,2),
    note('E4',16,4),note('C4',20,4),
    note('D4',24,2),note('E4',26,1),note('D4',27,1),note('C4',28,4),
  ]),
  '80s-lead-synth.json': lick(120, [
    note('C5',0,1),note('Bb4',1,1),note('G4',2,2),
    note('A4',4,1),note('G4',5,1),note('F4',6,2),
    note('G4',8,1),note('E4',9,1),note('C4',10,2),
    note('D4',12,1),note('F4',13,1),note('G4',14,2),
  ]),

  // HIP-HOP / LO-FI / TRAP
  'hiphop-melody.json': lick(90, [
    note('G4',0,2),note('F4',2,1),note('Eb4',3,1),
    note('D4',4,3),note('Eb4',7,1),
    note('C4',8,2),note('D4',10,1),note('Eb4',11,1),
    note('F4',12,4),
  ]),
  'trap-melody.json': lick(140, [
    note('Bb4',0,1),note('Ab4',1,1),note('Bb4',2,1),note('F4',3,1),
    note('Eb4',4,2),note('C4',6,1),note('Eb4',7,1),
    note('F4',8,1),note('Eb4',9,1),note('C4',10,2),
    note('Bb3',12,4),
  ]),
  'lofi-phrase.json': lick(70, [
    note('D4',0,3),note('C4',3,1),note('Bb3',4,2),note('A3',6,2),
    note('G3',8,4),note('A3',12,2),note('Bb3',14,2),
    note('C4',16,4),note('D4',20,4),
  ]),

  // WORLD / FOLK
  'flamenco-falseta.json': lick(145, [
    note('E5',0,1),note('D5',1,1),note('C5',2,1),note('B4',3,1),
    note('A4',4,1),note('G#4',5,1),note('A4',6,2),
    note('B4',8,1),note('C5',9,1),note('B4',10,1),note('A4',11,1),
    note('G#4',12,1),note('A4',13,1),note('E4',14,2),
  ]),
  'irish-jig.json': lick(175, [
    note('D5',0,1),note('E5',1,1),note('F#5',2,1),note('G5',3,1),
    note('F#5',4,1),note('E5',5,1),note('D5',6,1),note('C#5',7,1),
    note('B4',8,1),note('A4',9,1),note('B4',10,1),note('C#5',11,1),
    note('D5',12,2),note('F#5',14,1),note('A5',15,1),
  ]),
  'celtic-folk.json': lick(120, [
    note('A4',0,1),note('B4',1,1),note('C5',2,1),note('B4',3,1),
    note('A4',4,2),note('E5',6,1),note('D5',7,1),
    note('C5',8,1),note('B4',9,1),note('A4',10,1),note('G4',11,1),
    note('A4',12,4),
  ]),
  'reggae-skank.json': lick(75, [
    // Offbeat chords implied as individual notes
    note('C4',2,1),note('E4',2,1),
    note('G4',6,1),note('Bb4',6,1),
    note('C4',10,1),note('E4',10,1),
    note('G4',14,1),note('Bb4',14,1),
  ]),
  'tango-phrase.json': lick(130, [
    note('E4',0,1),note('F4',1,1),note('E4',2,1),note('D#4',3,1),
    note('E4',4,2),note('G4',6,1),note('B4',7,1),
    note('C5',8,2),note('B4',10,1),note('A4',11,1),
    note('G#4',12,1),note('A4',13,1),note('E4',14,3),
  ]),
  'afrobeat-melody.json': lick(110, [
    note('E4',0,1),note('G4',1,1),note('A4',2,1),note('G4',3,1),
    note('E4',4,2),note('D4',6,1),note('E4',7,1),
    note('G4',8,1),note('A4',9,1),note('B4',10,1),note('A4',11,1),
    note('G4',12,2),note('E4',14,2),
  ]),

  // GOSPEL
  'gospel-amen.json': lick(80, [
    note('C4',0,2),note('E4',2,2),note('G4',4,2),note('B4',6,2),
    note('C5',8,4),note('B4',12,1),note('A4',13,1),note('G4',14,1),note('F4',15,1),
    note('E4',16,2),note('G4',18,2),note('C4',20,4),
  ]),

  // SYNTH / ELECTRONIC
  'synthwave-arp.json': lick(115, [
    note('C4',0,1),note('E4',1,1),note('G4',2,1),note('B4',3,1),
    note('A3',4,1),note('C4',5,1),note('E4',6,1),note('G4',7,1),
    note('F3',8,1),note('A3',9,1),note('C4',10,1),note('E4',11,1),
    note('G3',12,1),note('B3',13,1),note('D4',14,1),note('G4',15,1),
  ]),

  // LATIN
  'latin-montuno.json': lick(160, [
    note('C4',0,1),note('E4',1,1),note('G4',2,1),note('C5',3,1),
    note('B4',4,1),note('G4',5,1),note('E4',6,1),note('C4',7,1),
    note('D4',8,1),note('F4',9,1),note('A4',10,1),note('D5',11,1),
    note('C#5',12,1),note('A4',13,1),note('F4',14,1),note('D4',15,1),
  ]),

  // ── LONGER / COOLER EXTENDED LICKS ──────────────────────────

  // Epic minor cinematic — 2 bars, broad leaps, builds to climax
  'cinematic-minor.json': lick(80, [
    note('A3',0,4),note('E4',4,2),note('G4',6,2),
    note('A4',8,3),note('G4',11,1),note('F4',12,2),note('E4',14,2),
    note('C4',16,4),note('E4',20,2),note('A4',22,2),
    note('B4',24,2),note('A4',26,1),note('G4',27,1),note('F4',28,2),note('E4',30,2),
  ]),

  // Lydian dream — floating major #4 vibe, long held notes
  'lydian-dream.json': lick(90, [
    note('C5',0,4),note('G5',4,2),note('F#5',6,2),
    note('E5',8,4),note('D5',12,2),note('C5',14,2),
    note('B4',16,4),note('A4',20,2),note('G4',22,2),
    note('C5',24,8),
  ]),

  // Jazz waltz head — 3/4 feel written in 4/4 steps, sophisticated
  'jazz-waltz.json': lick(140, [
    note('D5',0,2),note('C5',2,1),note('Bb4',3,1),note('A4',4,2),note('G4',6,4),
    note('F4',10,2),note('E4',12,1),note('D4',13,1),note('C4',14,2),
    note('D4',16,4),note('F4',20,2),note('A4',22,2),
    note('G4',24,4),note('Bb4',28,2),note('D5',30,2),
  ]),

  // Baroque invention — two implied voices, busy 16th run for 3 bars
  'baroque-invention.json': lick(108, [
    note('C5',0,1),note('B4',1,1),note('A4',2,1),note('G4',3,1),
    note('F4',4,1),note('E4',5,1),note('D4',6,1),note('C4',7,1),
    note('E4',8,1),note('G4',9,1),note('C5',10,1),note('E5',11,1),
    note('D5',12,1),note('C5',13,1),note('B4',14,1),note('A4',15,1),
    note('G4',16,1),note('A4',17,1),note('B4',18,1),note('C5',19,1),
    note('D5',20,1),note('E5',21,1),note('F5',22,1),note('G5',23,1),
    note('E5',24,2),note('C5',26,2),note('G4',28,4),
  ]),

  // Slow blues ballad — bends implied by Eb/Bb, 4 bars, very expressive
  'blues-ballad.json': lick(58, [
    note('A4',0,4),note('G4',4,2),note('Eb4',6,1),note('E4',7,1),
    note('D4',8,4),note('A3',12,4),
    note('C4',16,3),note('D4',19,1),note('E4',20,2),note('G4',22,2),
    note('A4',24,4),note('Bb4',28,2),note('A4',30,2),
    note('G4',32,4),note('E4',36,2),note('D4',38,2),
    note('C4',40,8),
  ]),

  // Coltrane sheets of sound — dense chromatic bebop, 2 bars
  'sheets-of-sound.json': lick(200, [
    note('C5',0,1),note('B4',1,1),note('Bb4',2,1),note('A4',3,1),
    note('Ab4',4,1),note('G4',5,1),note('Gb4',6,1),note('F4',7,1),
    note('E4',8,1),note('Eb4',9,1),note('D4',10,1),note('Db4',11,1),
    note('C4',12,2),note('G4',14,1),note('Bb4',15,1),
    note('A4',16,1),note('Ab4',17,1),note('G4',18,1),note('F4',19,1),
    note('E4',20,1),note('Eb4',21,1),note('D4',22,1),note('C4',23,1),
    note('G3',24,4),note('C4',28,4),
  ]),

  // Lofi chill study — slow, spacious, jazzy chords implied by top notes
  'lofi-study.json': lick(72, [
    note('F5',0,6),note('E5',6,2),
    note('D5',8,6),note('C5',14,2),
    note('Bb4',16,4),note('A4',20,2),note('G4',22,2),
    note('F4',24,8),
    note('G4',32,4),note('Bb4',36,2),note('C5',38,2),
    note('D5',40,6),note('C5',46,2),
    note('Bb4',48,8),
  ]),

  // Synthwave lead solo — arpeggios + melody, 2 bars high energy
  'synthwave-solo.json': lick(128, [
    note('C5',0,1),note('G4',1,1),note('E4',2,1),note('C4',3,1),
    note('D5',4,2),note('B4',6,2),
    note('E5',8,1),note('B4',9,1),note('G4',10,1),note('E4',11,1),
    note('F5',12,2),note('C5',14,2),
    note('G5',16,2),note('F5',18,1),note('E5',19,1),note('D5',20,2),note('C5',22,2),
    note('B4',24,1),note('C5',25,1),note('D5',26,1),note('E5',27,1),
    note('G5',28,4),
  ]),

  // Chopin-style nocturne — wide range, cantabile, 3 bars
  'nocturne.json': lick(66, [
    note('E5',0,6),note('D#5',6,2),
    note('E5',8,4),note('B4',12,2),note('G#4',14,2),
    note('A4',16,4),note('C5',20,2),note('E5',22,2),
    note('D5',24,4),note('B4',28,2),note('A4',30,2),
    note('G#4',32,8),
    note('A4',40,2),note('B4',42,2),note('C5',44,2),note('D5',46,2),
    note('E5',48,8),
  ]),

  // Cumbia + tropical vibes — bouncy, offbeat feel, 2 bars
  'cumbia-groove.json': lick(100, [
    note('G4',1,1),note('A4',2,2),note('G4',4,1),note('E4',5,1),
    note('D4',6,2),note('E4',8,1),note('G4',9,1),note('A4',10,2),
    note('G4',12,1),note('E4',13,1),note('D4',14,2),
    note('C4',17,1),note('D4',18,2),note('C4',20,1),note('A3',21,1),
    note('G3',22,2),note('A3',24,1),note('C4',25,1),note('D4',26,2),
    note('C4',28,1),note('A3',29,1),note('G3',30,2),
  ]),

  // Phrygia flamenco extended — darkly modal, intense, 3 bars
  'flamenco-extended.json': lick(150, [
    note('E5',0,1),note('F5',1,2),note('E5',3,1),note('D5',4,1),note('C5',5,2),
    note('B4',7,1),note('A4',8,2),note('G#4',10,1),note('A4',11,1),
    note('B4',12,2),note('C5',14,1),note('B4',15,1),
    note('A4',16,1),note('G#4',17,1),note('A4',18,2),note('E4',20,4),
    note('F4',24,1),note('E4',25,1),note('D4',26,1),note('C4',27,1),
    note('B3',28,1),note('A3',29,1),note('G#3',30,1),note('A3',31,1),
  ]),

  // Video game boss theme — tense, tritone jumps, 2 bars
  'boss-theme.json': lick(160, [
    note('C4',0,1),note('C4',1,1),note('Gb4',2,2),note('C4',4,1),note('C4',5,1),
    note('F4',6,2),note('C4',8,1),note('C4',9,1),note('Eb4',10,1),note('Gb4',11,1),
    note('F4',12,2),note('E4',14,2),
    note('C4',16,1),note('C4',17,1),note('Ab4',18,2),note('C4',20,1),note('Bb4',21,1),
    note('Ab4',22,1),note('G4',23,1),note('F4',24,2),note('Eb4',26,2),
    note('D4',28,2),note('C4',30,2),
  ]),

  // Gospel runs — call-response riff, lots of soul, 2 bars
  'gospel-run.json': lick(92, [
    note('C5',0,1),note('Bb4',1,1),note('G4',2,1),note('F4',3,1),
    note('E4',4,2),note('G4',6,1),note('Bb4',7,1),
    note('C5',8,2),note('Bb4',10,1),note('Ab4',11,1),
    note('G4',12,4),
    note('Eb5',16,1),note('D5',17,1),note('C5',18,1),note('Bb4',19,1),
    note('G4',20,2),note('Ab4',22,1),note('Bb4',23,1),
    note('C5',24,2),note('Bb4',26,1),note('G4',27,1),
    note('F4',28,4),
  ]),

  // Motown soul groove — hooky, repetitive, sticks in head
  'motown-groove.json': lick(115, [
    note('D4',0,2),note('E4',2,1),note('G4',3,1),note('A4',4,2),note('G4',6,2),
    note('E4',8,2),note('D4',10,2),note('E4',12,4),
    note('D4',16,2),note('E4',18,1),note('G4',19,1),note('A4',20,2),note('B4',22,2),
    note('A4',24,2),note('G4',26,2),note('D4',28,4),
  ]),

  // Dramatic orchestral swell — slow, big, ascending to climax
  'orchestral-swell.json': lick(60, [
    note('C3',0,4),note('G3',4,4),note('C4',8,4),note('E4',12,4),
    note('G4',16,4),note('C5',20,4),note('E5',24,4),
    note('G5',28,4),note('C6',32,8),
    note('B5',40,2),note('A5',42,2),note('G5',44,2),note('E5',46,2),
    note('C5',48,16),
  ]),
}


// Write all files
for (const [file, data] of Object.entries(beats)) {
  writeFileSync(`src/presets/beats/${file}`, JSON.stringify(data, null, 2))
}
for (const [file, data] of Object.entries(licks)) {
  writeFileSync(`src/presets/licks/${file}`, JSON.stringify(data, null, 2))
}

console.log(`✓ Written ${Object.keys(beats).length} beats + ${Object.keys(licks).length} licks`)
