/* Workout library, multi-week programs and gym routines. Items: [exerciseId, seconds] or [exerciseId, 'reps']. */
'use strict';

const W = (id, name, type, focus, level, rounds, rest, items, o = {}) => Object.assign({ id, name, type, focus, level, rounds, rest, items }, o);

const WORKOUTS = [
  // ---------- full body
  W('full-body', 'Full Body Burn', 'Strength', 'Full body', 2, 2, 15,
    [['jacks', 40], ['squat', 40], ['pushup', 30], ['lunge', 40], ['plank', 40], ['climbers', 30], ['bridge', 40]], { desc: 'Head-to-toe strength with a cardio kick. No equipment.' }),
  W('fb-beginner', 'Beginner Full Body', 'Strength', 'Full body', 1, 2, 20,
    [['jacks', 30], ['squat', 30], ['kneepush', 30], ['bridge', 30], ['plank', 20], ['birddog', 30]], { desc: 'The perfect first workout. Learn the basics, build the habit.' }),
  W('seven', 'Classic 7-Minute', 'Endurance', 'Full body', 2, 1, 10,
    [['jacks', 30], ['wall', 30], ['pushup', 30], ['crunch', 30], ['stepup', 30], ['squat', 30], ['dips', 30], ['plank', 30], ['hknees', 30], ['lunge', 30], ['rotpush', 30], ['splank', 30]], { desc: 'Twelve moves, thirty seconds each. Short and brutal.' }),
  W('fb-burn30', '30-Min Total Body', 'Endurance', 'Full body', 3, 3, 15,
    [['jacks', 40], ['squat', 45], ['pushup', 40], ['lunge', 45], ['climbers', 40], ['bridge', 45], ['plank', 45], ['burpee', 30], ['sumo', 45], ['taps', 40]], { desc: 'Three big rounds. Bring water.' }),
  W('sweat-20', '20-Min Sweat Session', 'Endurance', 'Full body', 2, 2, 15,
    [['jacks', 40], ['skaters', 40], ['pushup', 30], ['hknees', 40], ['vup', 30], ['climbers', 40], ['burpee', 30], ['plank', 40]], { desc: 'Keep the heart rate up from start to finish.' }),
  W('hiit', 'HIIT Cardio Blast', 'Endurance', 'Full body', 3, 4, 15,
    [['burpee', 30], ['hknees', 30], ['jsquat', 30], ['climbers', 30], ['skaters', 30], ['jacks', 30]], { desc: 'Short, all-out intervals. Go hard, then rest.' }),
  W('hiit-10', '10-Min HIIT Express', 'Endurance', 'Full body', 2, 2, 15,
    [['burpee', 30], ['jsquat', 30], ['climbers', 30], ['plankjack', 30], ['hknees', 30]], { desc: 'When you only have ten minutes.' }),
  W('fb-db', 'Dumbbell Full Body', 'Strength', 'Full body', 2, 3, 45,
    [['goblet', '12'], ['dbrow', '10'], ['dbshoulder', '10'], ['rdl', '12'], ['curl', '12'], ['dblunge', '10']], { equip: 'dumbbells', desc: 'A pair of dumbbells, every major muscle.' }),

  // ---------- abs & core
  W('abs-5', '5-Min Abs', 'Strength', 'Abs & core', 1, 1, 10,
    [['crunch', 40], ['bicycle', 40], ['legraise', 40], ['plank', 60]], { desc: 'Quick daily core finisher.' }),
  W('core', 'Core Crusher', 'Strength', 'Abs & core', 2, 2, 10,
    [['crunch', 40], ['bicycle', 40], ['plank', 45], ['splankL', 30], ['splankR', 30], ['legraise', 40], ['deadbug', 40], ['hollow', 30]], { desc: 'Front, sides and deep core.' }),
  W('abs-10', '10-Min Core Fire', 'Strength', 'Abs & core', 2, 1, 10,
    [['vup', 30], ['twist', 40], ['flutter', 40], ['revcrunch', 40], ['toetouch', 30], ['hollow', 30], ['splankL', 30], ['splankR', 30], ['plank', 45]], { desc: 'Nine moves, no rest for the abs.' }),
  W('abs-15', 'Six-Pack Builder', 'Strength', 'Abs & core', 3, 2, 10,
    [['vup', 30], ['twist', 40], ['flutter', 40], ['revcrunch', 40], ['toetouch', 30], ['hollow', 30], ['bicycle', 40], ['plank', 60]], { desc: 'Advanced core, two rounds.' }),
  W('core-runner', 'Core for Runners', 'Strength', 'Abs & core', 1, 2, 15,
    [['deadbug', 45], ['birddog', 45], ['plank', 45], ['splankL', 30], ['splankR', 30], ['bridge', 45], ['superman', 40]], { desc: 'Stability that keeps your form when you\'re tired.' }),
  W('abs-arms', 'Abs & Arms', 'Strength', 'Abs & core', 2, 2, 15,
    [['pushup', 30], ['crunch', 40], ['dpushup', 30], ['flutter', 40], ['dips', 40], ['twist', 40]], { desc: 'Alternate upper body and core.' }),

  // ---------- arms & shoulders
  W('upper', 'Upper Body Push', 'Strength', 'Arms & shoulders', 2, 3, 30,
    [['pushup', '12'], ['pike', '10'], ['dips', '12'], ['wpushup', '10'], ['taps', 40]], { desc: 'Chest, shoulders and triceps with just your bodyweight.' }),
  W('arms-bw', 'Bodyweight Arms', 'Strength', 'Arms & shoulders', 2, 3, 30,
    [['pushup', '10'], ['dips', '12'], ['dpushup', '8'], ['pike', '8'], ['taps', 40], ['armc', 30]], { desc: 'Sculpted arms, no weights needed.' }),
  W('arms-db', 'Dumbbell Arms', 'Strength', 'Arms & shoulders', 2, 3, 40,
    [['curl', '12'], ['triext', '12'], ['hammer', '12'], ['latraise', '12'], ['dbshoulder', '10']], { equip: 'dumbbells', desc: 'Biceps, triceps and shoulders.' }),
  W('shoulders', 'Shoulder Sculpt', 'Strength', 'Arms & shoulders', 2, 3, 40,
    [['dbshoulder', '10'], ['latraise', '12'], ['pike', '8'], ['taps', 40]], { equip: 'dumbbells', desc: 'Strong, stable shoulders.' }),

  // ---------- chest & back
  W('pyramid', 'Push-up Pyramid', 'Strength', 'Chest & back', 2, 1, 45,
    [['pushup', '5'], ['pushup', '10'], ['pushup', '15'], ['pushup', '10'], ['pushup', '5']], { desc: '45 push-ups up and down the pyramid.' }),
  W('pushup-100', '100 Push-up Workout', 'Strength', 'Chest & back', 3, 5, 60,
    [['pushup', '20']], { desc: 'Five sets of twenty. Rest as much as you need.' }),
  W('back-db', 'Back Builder', 'Strength', 'Chest & back', 2, 3, 40,
    [['dbrow', '10'], ['rdl', '12'], ['superman', 40], ['birddog', 40]], { equip: 'dumbbells', desc: 'Posture and pulling strength.' }),
  W('chest-db', 'Chest Press', 'Strength', 'Chest & back', 2, 3, 45,
    [['dbpress', '10'], ['pushup', '12'], ['wpushup', '10'], ['rotpush', 30]], { equip: 'dumbbells', desc: 'Dumbbell press plus push-up finishers.' }),

  // ---------- legs & glutes
  W('legs', 'Leg Day, No Equipment', 'Strength', 'Legs & glutes', 2, 2, 15,
    [['squat', 45], ['lunge', 45], ['wall', 45], ['bridge', 45], ['calf', 45], ['jsquat', 30], ['slunge', 45]], { desc: 'Quads, glutes and calves at home.' }),
  W('glutes', 'Glute Activation', 'Strength', 'Legs & glutes', 1, 2, 10,
    [['bridge', 40], ['clamL', 30], ['clamR', 30], ['donkey', 40], ['firehyd', 40], ['bridgeL', 30], ['bridgeR', 30]], { desc: 'Wake up the glutes before a run or lift.' }),
  W('legs-burn', 'Lower Body Burn', 'Endurance', 'Legs & glutes', 3, 3, 15,
    [['pulsesq', 30], ['jsquat', 30], ['lunge', 40], ['wall', 45], ['sumo', 40], ['calf', 40], ['tuckjump', 20]], { desc: 'Burn, then burn some more.' }),
  W('legs-db', 'Dumbbell Leg Day', 'Strength', 'Legs & glutes', 2, 3, 45,
    [['goblet', '12'], ['dblunge', '10'], ['rdl', '12'], ['stepup', 45], ['calf', '20']], { equip: 'dumbbells', desc: 'Loaded legs with dumbbells.' }),
  W('runner-strength', "Runner's Strength", 'Strength', 'Legs & glutes', 1, 2, 15,
    [['bridgeL', 40], ['bridgeR', 40], ['lunge', 45], ['calf', 45], ['splankL', 30], ['splankR', 30], ['clamL', 40], ['clamR', 40], ['birddog', 45], ['plank', 45]], { desc: 'Hips, glutes and core to stay injury-free.' }),
  W('runner-power', "Runner's Power", 'Endurance', 'Legs & glutes', 3, 3, 20,
    [['jsquat', 30], ['skaters', 40], ['stepup', 40], ['hknees', 30], ['buttkick', 30], ['calf', 40]], { desc: 'Springy legs for faster running.' }),

  // ---------- mobility & yoga
  W('stretch', 'Post-Run Stretch', 'Mobility', 'Mobility', 1, 1, 5,
    [['quadL', 40], ['quadR', 40], ['ham', 45], ['hipL', 40], ['hipR', 40], ['calfsL', 30], ['calfsR', 30], ['pigeonL', 45], ['pigeonR', 45], ['child', 60]], { desc: 'Ten minutes to loosen everything that running tightens.' }),
  W('wake', 'Morning Wake-Up', 'Mobility', 'Mobility', 1, 1, 5,
    [['armc', 30], ['catcow', 40], ['squat', 30], ['inch', 40], ['jacks', 30], ['wgsL', 30], ['wgsR', 30], ['plank', 30]], { desc: 'Get the blood moving before your day.' }),
  W('hips', 'Hip Opener', 'Mobility', 'Mobility', 1, 1, 5,
    [['hipL', 45], ['hipR', 45], ['pigeonL', 60], ['pigeonR', 60], ['butterfly', 60], ['wgsL', 40], ['wgsR', 40]], { desc: 'For tight hips from sitting and running.' }),
  W('desk', 'Desk Break', 'Mobility', 'Mobility', 1, 1, 5,
    [['armc', 30], ['catcow', 40], ['fold', 30], ['quadL', 30], ['quadR', 30], ['mountain', 30]], { desc: 'Five minutes away from the screen.' }),
  W('yoga-flow', 'Yoga Flow', 'Yoga', 'Mobility', 1, 1, 5,
    [['mountain', 40], ['fold', 40], ['chairpose', 40], ['downdog', 45], ['cobra', 40], ['child', 45], ['warrior2', 40], ['tree', 40]], { desc: 'A gentle, balanced flow for any day.' }),
  W('bedtime', 'Bedtime Stretch', 'Yoga', 'Mobility', 1, 1, 5,
    [['child', 60], ['butterfly', 60], ['ham', 60], ['pigeonL', 45], ['pigeonR', 45], ['catcow', 40]], { desc: 'Slow, quiet stretches to wind down.' }),
];

const W_FOCUS = ['Full body', 'Abs & core', 'Arms & shoulders', 'Chest & back', 'Legs & glutes', 'Mobility'];
const W_TYPES = ['Strength', 'Endurance', 'Mobility', 'Yoga'];

// Multi-week programs: weeks of workout ids
const PROGRAMS = [
  { id: 'p-start', name: 'Get Started', e: '🌱', weeks: 4, level: 1, desc: 'Three short sessions a week to build the habit and learn the moves.',
    plan: [['fb-beginner', 'core-runner', 'wake'], ['fb-beginner', 'glutes', 'abs-5'], ['full-body', 'core', 'yoga-flow'], ['full-body', 'sweat-20', 'abs-10']] },
  { id: 'p-bw', name: 'Bodyweight Strength', e: '💪', weeks: 6, level: 2, desc: 'Four sessions a week rotating upper, lower, core and full body. No kit.',
    plan: [['upper', 'legs', 'core', 'full-body'], ['upper', 'legs', 'abs-10', 'full-body'], ['arms-bw', 'legs-burn', 'core', 'sweat-20'],
      ['arms-bw', 'legs', 'abs-10', 'fb-burn30'], ['pyramid', 'legs-burn', 'abs-15', 'hiit'], ['pushup-100', 'legs-burn', 'abs-15', 'fb-burn30']] },
  { id: 'p-hiit', name: 'HIIT & Core', e: '⚡', weeks: 4, level: 3, desc: 'Fast, sweaty sessions plus core work for a stronger engine.',
    plan: [['hiit-10', 'abs-10', 'sweat-20', 'core'], ['hiit', 'abs-10', 'sweat-20', 'abs-15'], ['hiit', 'abs-15', 'fb-burn30', 'core'], ['hiit', 'abs-15', 'fb-burn30', 'legs-burn']] },
  { id: 'p-runner', name: "Runner's Strength", e: '🏃', weeks: 6, level: 1, desc: 'Strength and mobility to run faster and stay injury-free. Pairs with any run plan.',
    plan: [['runner-strength', 'glutes', 'stretch'], ['runner-strength', 'core-runner', 'hips'], ['runner-strength', 'glutes', 'stretch'],
      ['runner-power', 'core-runner', 'hips'], ['runner-power', 'runner-strength', 'stretch'], ['runner-power', 'core-runner', 'yoga-flow']] },
  { id: 'p-db', name: 'Dumbbell Builder', e: '🏋️', weeks: 6, level: 2, desc: 'Three dumbbell sessions a week for real strength at home.',
    plan: [['fb-db', 'arms-db', 'legs-db'], ['fb-db', 'back-db', 'legs-db'], ['chest-db', 'back-db', 'legs-db'],
      ['fb-db', 'arms-db', 'legs-db'], ['chest-db', 'shoulders', 'legs-db'], ['fb-db', 'arms-db', 'back-db']] },
];

// Gym routines: sets × reps (or sec) with rest
const G = (ex, sets, reps, rest = 90, sec = 0) => ({ ex, sets, reps, rest, sec });
const GYM_ROUTINES = [
  { id: 'push', name: 'Push Day', e: '🏋️', focus: 'Chest · shoulders · triceps',
    items: [G('bench', 4, 8, 120), G('ohp', 3, 8, 90), G('dbpress', 3, 10), G('latraise', 3, 12, 60), G('pushdown', 3, 12, 60), G('dips', 3, 10, 60)] },
  { id: 'pull', name: 'Pull Day', e: '🧗', focus: 'Back · biceps',
    items: [G('deadlift', 3, 5, 150), G('pullup', 4, 8, 90), G('row', 4, 8), G('pulldown', 3, 10), G('curl', 3, 12, 60), G('hammer', 3, 12, 60)] },
  { id: 'legday', name: 'Leg Day', e: '🦵', focus: 'Quads · glutes · hamstrings',
    items: [G('backsquat', 4, 6, 150), G('rdl', 3, 10, 90), G('legpress', 3, 12), G('dblunge', 3, 10), G('hipthrust', 3, 10), G('calf', 4, 15, 45)] },
  { id: 'upper-g', name: 'Upper Body', e: '💪', focus: 'Chest · back · arms',
    items: [G('bench', 4, 6, 120), G('row', 4, 6, 120), G('ohp', 3, 8), G('pulldown', 3, 10), G('curl', 2, 12, 60), G('triext', 2, 12, 60)] },
  { id: 'lower-g', name: 'Lower Body', e: '🏋️', focus: 'Legs · core',
    items: [G('backsquat', 4, 6, 150), G('deadlift', 3, 5, 150), G('legpress', 3, 10), G('calf', 3, 15, 45), G('plank', 3, 0, 45, 45)] },
  { id: '5x5a', name: '5×5 — Workout A', e: '🅰️', focus: 'Strength basics',
    items: [G('backsquat', 5, 5, 150), G('bench', 5, 5, 150), G('row', 5, 5, 150)] },
  { id: '5x5b', name: '5×5 — Workout B', e: '🅱️', focus: 'Strength basics',
    items: [G('backsquat', 5, 5, 150), G('ohp', 5, 5, 150), G('deadlift', 1, 5, 180)] },
  { id: 'fb-gym', name: 'Full Body Gym', e: '🔁', focus: 'Everything in one session',
    items: [G('goblet', 3, 10), G('dbpress', 3, 10), G('dbrow', 3, 10), G('rdl', 3, 10), G('dbshoulder', 3, 10), G('plank', 3, 0, 45, 40)] },
];
