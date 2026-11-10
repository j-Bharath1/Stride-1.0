/* Exercise library: name, how-to steps, muscles, equipment and animated demo for each move. */
'use strict';

const EX = {};
const EXCAT = {}; // id -> category for the library browser
(() => {
  const { pose, plank, plankNeckX, squat, lunge, supine, prone, quad, seated } = PB;
  const X = (cat, id, n, e, muscles, steps, fig, equip = 'none') => {
    EX[id] = { n, e, muscles, steps, cue: steps[steps.length - 1], fig, equip, cat };
    EXCAT[id] = cat;
  };
  const alias = (id, from, n) => { EX[id] = Object.assign({}, EX[from], { n }); EXCAT[id] = EXCAT[from]; };

  // shared plank geometry
  const TOP = plank();
  const HX = plankNeckX();
  const BOTTOM = plank({ elev: 6, handX: HX, bend: 'u' });
  const topNeck = Fig.solve(TOP).neck, topHip = Fig.solve(TOP).hip;
  const STAND = pose({});
  const front = (o) => pose(Object.assign({ ll: { ik: [-4, 0] }, rl: { ik: [4, 0] }, la: [-8, -5], ra: [8, 5] }, o));

  // ---------------------------------------------------------------- cardio / full body
  X('Cardio', 'jacks', 'Jumping jacks', '🙌', 'Full body · cardio',
    ['Stand tall, feet together, arms by your sides.', 'Jump feet out wide while swinging arms overhead.', 'Jump back to the start. Stay light on your feet.'],
    { front: true, dur: 1, frames: [front({}), front({ hip: [0, 39], ll: { ik: [-15, 0] }, rl: { ik: [15, 0] }, la: [-150, -165], ra: [150, 165] })] });
  X('Cardio', 'hknees', 'High knees', '🏃', 'Hip flexors · cardio',
    ['Stand tall with arms bent at your sides.', 'Drive one knee up to hip height, then the other.', 'Pump your arms and stay on the balls of your feet.'],
    { dur: .7, frames: [pose({ rl: [95, 0], la: [55, 150], ra: [-35, 30], lift: 2 }), pose({ ll: [95, 0], rl: { ik: [1.5, 0] }, ra: [55, 150], la: [-35, 30], lift: 2 })] });
  X('Cardio', 'buttkick', 'Butt kicks', '🦶', 'Hamstrings · cardio',
    ['Jog in place.', 'Kick each heel up towards your glutes.', 'Keep your knees pointing down and your chest up.'],
    { dur: .7, frames: [pose({ rl: [-8, -170], la: [40, 130], ra: [-30, 20], lift: 2 }), pose({ ll: [-8, -170], ra: [40, 130], la: [-30, 20], lift: 2 })] });
  X('Cardio', 'climbers', 'Mountain climbers', '⛰️', 'Core · shoulders · cardio',
    ['Start in a high plank, hands under shoulders.', 'Drive one knee towards your chest, then switch fast.', 'Keep hips low and level, like running on the spot.'],
    { dur: .8, frames: [Object.assign({}, TOP, { rl: { ik: [topHip[0] + 15, 3], bend: 'd' } }), Object.assign({}, TOP, { ll: { ik: [topHip[0] + 15, 3], bend: 'd' } })] });
  X('Cardio', 'burpee', 'Burpees', '🔥', 'Full body · cardio',
    ['From standing, squat and put your hands on the floor.', 'Jump your feet back to a plank, chest to the floor.', 'Jump feet in and explode up, arms overhead.'],
    { dur: 2.6, frames: [pose({ hip: [-38, 41], ll: { ik: [-39.5, 0] }, rl: { ik: [-36.5, 0] }, la: [175, 178], ra: [178, 182], lift: 5 }),
      squat(1, { hip: [-46, 22], ll: { ik: [-36, 0], bend: 'f' }, rl: { ik: [-34, 0], bend: 'f' }, la: { ik: [-22, 0], bend: 'b' }, ra: { ik: [-20, 0], bend: 'b' }, t: 60 }), TOP, BOTTOM] });
  X('Cardio', 'skaters', 'Skaters', '⛸️', 'Glutes · legs · balance',
    ['Leap sideways onto one leg, landing softly.', 'Sweep the other leg behind you.', 'Leap back the other way. Stay low.'],
    { front: true, dur: 1.4, frames: [pose({ hip: [-14, 34], ll: { ik: [-14, 0], bend: 'b' }, rl: { ik: [-24, 4], bend: 'd' }, la: [40, 60], ra: [60, 70], t: -6 }),
      pose({ hip: [14, 34], rl: { ik: [14, 0], bend: 'f' }, ll: { ik: [24, 4], bend: 'd' }, ra: [-40, -60], la: [-60, -70], t: 6 })] });
  X('Cardio', 'tuckjump', 'Tuck jumps', '🦘', 'Legs · power',
    ['Start with feet hip-width apart.', 'Jump up and pull your knees to your chest.', 'Land softly and go straight into the next jump.'],
    { dur: 1.1, frames: [squat(.5), pose({ lift: 16, hip: [0, 41], ll: [125, -5], rl: [130, 0], la: [70, 20], ra: [75, 25], t: 10 })] });
  X('Cardio', 'plankjack', 'Plank jacks', '⭐', 'Core · shoulders · cardio',
    ['Hold a high plank.', 'Jump your feet out wide, then back together.', 'Keep your hips level, don\'t let them bounce.'],
    { dur: 1, frames: [TOP, Object.assign({}, TOP, { lift: 1.5, ll: { ik: [-44, 1] }, rl: { ik: [-36, 2] } })] });
  X('Cardio', 'bear', 'Bear crawl hold', '🐻', 'Core · shoulders · quads',
    ['On hands and knees, lift knees one inch off the floor.', 'Back flat, hips level with shoulders.', 'Hold and breathe. Knees stay hovering.'],
    { frames: [quad({ hip: [0, 24], t: 84, ll: [4, -82], rl: [6, -80] })] });

  // ---------------------------------------------------------------- legs & glutes
  X('Legs', 'squat', 'Squats', '🦵', 'Quads · glutes',
    ['Feet shoulder-width apart, toes slightly out.', 'Sit hips back and down until thighs are parallel.', 'Drive through your heels to stand. Chest up.'],
    { dur: 2.4, frames: [squat(0, { la: [10, 20], ra: [5, 12] }), squat(1)] });
  X('Legs', 'jsquat', 'Jump squats', '🦘', 'Quads · glutes · power',
    ['Squat down with arms back.', 'Explode up into a jump, arms swinging forward.', 'Land softly and sink straight into the next squat.'],
    { dur: 1.3, frames: [squat(.9, { la: [-30, -20], ra: [-35, -25] }), pose({ lift: 10, ll: [-4, -8], rl: [3, 0], la: [150, 160], ra: [155, 165] })] });
  X('Legs', 'pulsesq', 'Squat pulses', '💓', 'Quads · glutes',
    ['Sink into a low squat.', 'Pulse up and down a few centimetres.', 'Stay low the whole time. Feel the burn.'],
    { dur: .7, frames: [squat(.75), squat(.95)] });
  X('Legs', 'sumo', 'Sumo squats', '🦵', 'Inner thighs · glutes',
    ['Stand wide with toes turned out.', 'Lower straight down, knees tracking over toes.', 'Squeeze glutes to stand.'],
    { front: true, dur: 2.4, frames: [front({ ll: { ik: [-14, 0], bend: 'b' }, rl: { ik: [14, 0], bend: 'f' }, la: [20, 40], ra: [-20, -40] }),
      front({ hip: [0, 26], ll: { ik: [-15, 0], bend: 'b' }, rl: { ik: [15, 0], bend: 'f' }, la: [20, 40], ra: [-20, -40] })] });
  X('Legs', 'lunge', 'Reverse lunges', '🦵', 'Quads · glutes',
    ['Stand tall, hands on hips or by your sides.', 'Step one foot back and lower until both knees are at 90°.', 'Push through the front heel to return. Alternate legs.'],
    { dur: 2.4, frames: [STAND, lunge(1)] });
  X('Legs', 'fwdlunge', 'Forward lunges', '🦵', 'Quads · glutes',
    ['Stand tall.', 'Step forward and lower until the back knee nearly touches.', 'Push back to standing. Alternate.'],
    { dur: 2.4, frames: [pose({ hip: [-10, 41], ll: { ik: [-11.5, 0] }, rl: { ik: [-8.5, 0] } }), lunge(1)] });
  X('Legs', 'slunge', 'Side lunges', '↔️', 'Inner thighs · glutes',
    ['Stand with feet together.', 'Take a big step to the side and sit into that hip.', 'Keep the other leg straight. Push back to centre.'],
    { front: true, dur: 2.4, frames: [front({}), front({ hip: [-12, 27], ll: { ik: [-24, 0], bend: 'b' }, rl: { ik: [12, 0] }, la: [40, 60], ra: [-10, 40] })] });
  X('Legs', 'wall', 'Wall sit', '🧱', 'Quads',
    ['Back flat against a wall.', 'Slide down until thighs are parallel to the floor.', 'Knees over ankles. Hold.'],
    { props: [{ wall: -16 }], frames: [pose({ hip: [-10, 21], t: 0, ll: { ik: [11, 0], bend: 'u' }, rl: { ik: [13, 0], bend: 'u' }, la: [30, 60], ra: [35, 65] })] });
  X('Legs', 'bridge', 'Glute bridge', '🌉', 'Glutes · hamstrings',
    ['Lie on your back, knees bent, feet flat.', 'Drive through your heels to lift hips.', 'Squeeze glutes at the top, lower slowly.'],
    { dur: 2.2, frames: [supine({ la: { ik: [-6, 0.6], bend: 'u' }, ra: { ik: [-4, 0.6], bend: 'u' } }),
      supine({ hip: [0, 20], neck: [-27, 5.5], la: { ik: [-6, 0.6], bend: 'u' }, ra: { ik: [-4, 0.6], bend: 'u' } })] });
  X('Legs', 'bridgeL', 'Single-leg bridge', '🌉', 'Glutes · hamstrings',
    ['Lie on your back, one foot flat, other leg straight.', 'Lift your hips using the planted leg.', 'Keep hips level. Lower with control.'],
    { dur: 2.2, frames: [supine({ rl: [100, 100], la: { ik: [-6, 0.6], bend: 'u' }, ra: { ik: [-4, 0.6], bend: 'u' } }),
      supine({ hip: [0, 19], neck: [-27, 5.5], rl: [118, 118], la: { ik: [-6, 0.6], bend: 'u' }, ra: { ik: [-4, 0.6], bend: 'u' } })] });
  alias('bridgeR', 'bridgeL', 'Single-leg bridge');
  X('Legs', 'calf', 'Calf raises', '🦶', 'Calves',
    ['Stand tall, feet hip-width apart.', 'Rise up onto your toes as high as you can.', 'Lower slowly all the way down.'],
    { dur: 1.6, frames: [STAND, pose({ lift: 4.5 })] });
  X('Legs', 'clamL', 'Clamshells', '🐚', 'Glutes (side)',
    ['Lie on your side, knees bent, feet together.', 'Keeping feet touching, lift the top knee.', 'Lower slowly. Don\'t roll your hips back.'],
    { dur: 2, frames: [supine({ hip: [0, 5], rl: { ik: [17, 1.5], bend: 'u' }, ll: { ik: [18, 1], bend: 'u' } }),
      supine({ hip: [0, 5], rl: [160, 100], ll: { ik: [18, 1], bend: 'u' } })] });
  alias('clamR', 'clamL', 'Clamshells');
  X('Legs', 'donkey', 'Donkey kicks', '🐴', 'Glutes',
    ['On hands and knees, back flat.', 'Keeping the knee bent, kick one foot up to the ceiling.', 'Squeeze the glute at the top, lower with control.'],
    { dur: 1.8, frames: [quad(), quad({ rl: [-100, 175] })] });
  X('Legs', 'firehyd', 'Fire hydrants', '🧯', 'Glutes (side)',
    ['On hands and knees.', 'Lift one bent knee out to the side.', 'Keep your torso still. Lower and repeat.'],
    { dur: 1.8, frames: [quad(), quad({ rl: [-40, -100] })] });
  X('Legs', 'stepup', 'Step-ups', '🪜', 'Quads · glutes',
    ['Stand facing a sturdy step or chair.', 'Step up, driving through the front heel.', 'Stand tall on top, then step down. Alternate.'],
    { props: [{ box: [6, 32, 15] }], dur: 2.4, frames: [pose({ hip: [-4, 41], rl: { ik: [15, 15], bend: 'f' }, ll: { ik: [-5.5, 0] }, t: 10 }),
      pose({ hip: [16, 56], rl: { ik: [17, 15] }, ll: [60, -10], la: [10, 30], ra: [-10, 5] })] });
  X('Legs', 'kbswing', 'Kettlebell swing', '🏋️', 'Glutes · hamstrings · back',
    ['Feet wide, kettlebell between your feet.', 'Hinge at the hips and hike it back between your legs.', 'Snap hips forward to swing it to chest height.'],
    { props: [{ kb: true }], dur: 1.6, frames: [pose({ hip: [-9, 37], t: 68, ll: { ik: [-1, 0] }, rl: { ik: [1, 0] }, la: [-25, -25], ra: [-22, -22] }),
      pose({ la: [88, 88], ra: [90, 90] })] }, 'kettlebell');

  // ---------------------------------------------------------------- chest, arms & shoulders
  X('Upper body', 'pushup', 'Push-ups', '💪', 'Chest · triceps · shoulders',
    ['Hands just wider than shoulders, body in a straight line.', 'Lower your chest to just above the floor.', 'Press back up. Squeeze glutes so hips don\'t sag.'],
    { dur: 2, frames: [TOP, BOTTOM] });
  alias('wpushup', 'pushup', 'Wide push-ups');
  alias('dpushup', 'pushup', 'Diamond push-ups');
  EX.wpushup = Object.assign({}, EX.wpushup, { steps: ['Hands wider than shoulders.', 'Lower your chest between your hands.', 'Press up, elbows flaring slightly out.'], muscles: 'Chest · shoulders' });
  EX.dpushup = Object.assign({}, EX.dpushup, { steps: ['Hands together under your chest, fingers forming a diamond.', 'Lower with elbows tucked to your sides.', 'Press up. Triceps do the work.'], muscles: 'Triceps · chest' });
  X('Upper body', 'kneepush', 'Knee push-ups', '💪', 'Chest · triceps',
    ['Knees on the floor, body straight from knees to head.', 'Lower your chest to the floor.', 'Press back up. Great for building to full push-ups.'],
    { dur: 2, frames: [plank({ knees: true, elev: 29, feetX: -14 }), plank({ knees: true, elev: 9, feetX: -14, handX: Fig.solve(plank({ knees: true, elev: 29, feetX: -14 })).neck[0], bend: 'u' })] });
  X('Upper body', 'pike', 'Pike push-ups', '🔺', 'Shoulders · triceps',
    ['From downward dog, hips high.', 'Bend elbows to lower the top of your head towards the floor.', 'Press back up through your shoulders.'],
    { dur: 2, frames: [pose({ hip: [0, 37], t: 142, ll: { ik: [-24, 0] }, rl: { ik: [-22, 0] }, la: { ik: [21, 0], bend: 'b' }, ra: { ik: [23, 0], bend: 'b' }, head: 10 }),
      pose({ hip: [2, 34], t: 162, ll: { ik: [-24, 0] }, rl: { ik: [-22, 0] }, la: { ik: [21, 0], bend: 'u' }, ra: { ik: [23, 0], bend: 'u' }, head: 10 })] });
  X('Upper body', 'rotpush', 'Push-up + rotation', '🔄', 'Chest · core · shoulders',
    ['Do a push-up.', 'At the top, rotate and reach one arm to the sky.', 'Return and repeat to the other side.'],
    { dur: 3, frames: [TOP, BOTTOM, TOP, Object.assign({}, TOP, { ra: [178, 180], tAdj: -4 })] });
  X('Upper body', 'dips', 'Tricep dips', '🪑', 'Triceps · shoulders',
    ['Hands on the edge of a chair behind you, legs out front.', 'Bend elbows to lower until they reach 90°.', 'Press back up. Keep your back close to the chair.'],
    { props: [{ box: [-26, -6, 18] }], dur: 2, frames: [pose({ hip: [-7, 20], t: -4, ll: { ik: [20, 0], bend: 'u' }, rl: { ik: [22, 0], bend: 'u' }, la: { ik: [-12, 18], bend: 'b' }, ra: { ik: [-10, 18], bend: 'b' } }),
      pose({ hip: [-7, 10], t: -4, ll: { ik: [20, 0], bend: 'u' }, rl: { ik: [22, 0], bend: 'u' }, la: { ik: [-12, 18], bend: 'b' }, ra: { ik: [-10, 18], bend: 'b' } })] });
  X('Upper body', 'taps', 'Plank shoulder taps', '👋', 'Core · shoulders',
    ['High plank, feet a little wider for balance.', 'Lift one hand and tap the opposite shoulder.', 'Alternate. Keep hips still.'],
    { dur: 1.4, frames: [TOP, Object.assign({}, TOP, { ra: { ik: [topNeck[0] - 3, topNeck[1] - 1], bend: 'd' } })] });
  X('Upper body', 'armc', 'Arm circles', '🔄', 'Shoulders',
    ['Stand tall, arms straight out to the sides.', 'Make small circles, getting bigger.', 'Switch direction halfway.'],
    { front: true, dur: 1.2, frames: [front({ la: [-100, -100], ra: [100, 100] }), front({ la: [-80, -80], ra: [80, 80] })] });

  // ---------------------------------------------------------------- core
  X('Core', 'plank', 'Plank', '🧱', 'Core · shoulders',
    ['Forearms down, elbows under shoulders.', 'Body in one line from heels to head.', 'Squeeze glutes and abs. Breathe and hold.'],
    { frames: [plank({ forearm: true, elev: 10.5 })] });
  X('Core', 'splank', 'Side plank', '📐', 'Obliques · core',
    ['Lie on your side, forearm under your shoulder.', 'Lift your hips so your body is a straight line.', 'Top arm up or on hip. Hold, then switch.'],
    { front: true, frames: [plank({ forearm: true, elev: 13, ra: [178, 180] })] });
  alias('splankL', 'splank', 'Side plank (left)');
  alias('splankR', 'splank', 'Side plank (right)');
  X('Core', 'crunch', 'Crunches', '🔥', 'Abs',
    ['Lie on your back, knees bent, hands by your head.', 'Curl your shoulders off the floor using your abs.', 'Lower slowly. Lower back stays down.'],
    { dur: 1.8, frames: [supine({ la: { ik: [-34, 9], bend: 'u' }, ra: { ik: [-33, 8], bend: 'u' } }), supine({ t: -64, la: { ik: [-25, 22], bend: 'u' }, ra: { ik: [-24, 21], bend: 'u' } })] });
  X('Core', 'bicycle', 'Bicycle crunches', '🚲', 'Abs · obliques',
    ['On your back, hands behind your head, legs lifted.', 'Bring one elbow towards the opposite knee as the other leg extends.', 'Switch sides in a slow pedalling motion.'],
    { dur: 1.6, frames: [supine({ t: -66, rl: [135, 85], ll: [98, 98], la: { ik: [-24, 20], bend: 'u' }, ra: { ik: [-20, 22], bend: 'u' } }),
      supine({ t: -66, ll: [135, 85], rl: [98, 98], la: { ik: [-20, 22], bend: 'u' }, ra: { ik: [-24, 20], bend: 'u' } })] });
  X('Core', 'legraise', 'Leg raises', '🦵', 'Lower abs',
    ['Lie flat, hands under your hips.', 'Keeping legs straight, lift them to vertical.', 'Lower slowly without touching the floor.'],
    { dur: 2.4, frames: [supine({ t: -90, ll: [96, 96], rl: [97, 97], la: [-5, 90], ra: [-3, 92] }), supine({ t: -90, ll: [178, 178], rl: [180, 180], la: [-5, 90], ra: [-3, 92] })] });
  X('Core', 'deadbug', 'Dead bug', '🪲', 'Deep core',
    ['On your back, arms up, knees bent at 90° in the air.', 'Lower opposite arm and leg towards the floor.', 'Return and switch. Back stays flat.'],
    { dur: 2.4, frames: [supine({ t: -90, ll: [176, 92], rl: [178, 94], la: [178, 178], ra: [182, 182] }),
      supine({ t: -90, ll: [176, 92], rl: [100, 98], la: [-96, -96], ra: [182, 182] })] });
  X('Core', 'hollow', 'Hollow hold', '🍌', 'Abs',
    ['Lie on your back, arms overhead.', 'Lift shoulders and legs a few inches off the floor.', 'Press lower back down. Hold the banana shape.'],
    { frames: [supine({ hip: [0, 4], t: -74, ll: [104, 104], rl: [106, 106], la: [-75, -78], ra: [-72, -75] })] });
  X('Core', 'flutter', 'Flutter kicks', '🌊', 'Lower abs',
    ['Lie flat, legs straight and slightly raised.', 'Kick legs up and down in small fast motions.', 'Keep your lower back pressed down.'],
    { dur: .6, frames: [supine({ t: -82, ll: [100, 100], rl: [114, 114], la: [-5, 92], ra: [-3, 94] }), supine({ t: -82, ll: [114, 114], rl: [100, 100], la: [-5, 92], ra: [-3, 94] })] });
  X('Core', 'twist', 'Russian twists', '🌀', 'Obliques',
    ['Sit, lean back slightly, feet off the floor.', 'Hands together, rotate your torso side to side.', 'Move from your ribs, not just your arms.'],
    { dur: 1.4, frames: [seated({ ll: { ik: [20, 8], bend: 'u' }, rl: { ik: [22, 9], bend: 'u' }, la: { ik: [12, 26], bend: 'd' }, ra: { ik: [13, 26], bend: 'd' } }),
      seated({ ll: { ik: [20, 8], bend: 'u' }, rl: { ik: [22, 9], bend: 'u' }, la: { ik: [4, 14], bend: 'd' }, ra: { ik: [5, 14], bend: 'd' }, t: -22 })] });
  X('Core', 'birddog', 'Bird dog', '🐕', 'Core · lower back',
    ['On hands and knees, back flat.', 'Reach one arm forward and the opposite leg back.', 'Hold a beat, return, switch sides.'],
    { dur: 2.6, frames: [quad(), quad({ ra: [92, 92], ll: [-92, -92] })] });
  X('Core', 'superman', 'Superman', '🦸', 'Lower back · glutes',
    ['Lie face down, arms stretched forward.', 'Lift arms, chest and legs off the floor.', 'Squeeze, hold a second, lower slowly.'],
    { dur: 2, frames: [prone({ la: [92, 90], ra: [90, 90] }), prone({ t: 78, ll: [-78, -80], rl: [-80, -82], la: [102, 102], ra: [100, 100] })] });
  X('Core', 'vup', 'V-ups', '✌️', 'Abs',
    ['Lie flat, arms overhead.', 'Lift legs and torso together, reaching hands to toes.', 'Lower with control.'],
    { dur: 2, frames: [supine({ t: -90, ll: [94, 94], rl: [95, 95], la: [-90, -90], ra: [-88, -88] }), supine({ t: -42, ll: [138, 138], rl: [140, 140], la: [120, 120], ra: [122, 122] })] });
  X('Core', 'situp', 'Sit-ups', '🔥', 'Abs · hip flexors',
    ['Lie down, knees bent, feet flat, arms crossed.', 'Sit all the way up.', 'Lower back down with control.'],
    { dur: 2.2, frames: [supine({ la: [-160, 60], ra: [-150, 70] }), supine({ t: -12, la: [100, 160], ra: [110, 170] })] });
  X('Core', 'revcrunch', 'Reverse crunch', '🔄', 'Lower abs',
    ['On your back, knees bent at 90° in the air.', 'Curl your hips off the floor towards your chest.', 'Lower slowly.'],
    { dur: 1.8, frames: [supine({ t: -90, ll: [176, 92], rl: [178, 94], la: [-5, 92], ra: [-3, 94] }), supine({ hip: [0, 7], t: -96, ll: [200, 120], rl: [202, 122], la: [-5, 92], ra: [-3, 94] })] });
  X('Core', 'toetouch', 'Toe touches', '👆', 'Upper abs',
    ['On your back, legs straight up.', 'Reach your hands towards your toes, lifting your shoulders.', 'Lower and repeat.'],
    { dur: 1.6, frames: [supine({ t: -90, ll: [178, 178], rl: [180, 180], la: [176, 176], ra: [178, 178] }), supine({ t: -62, ll: [178, 178], rl: [180, 180], la: { ik: [3, 40] }, ra: { ik: [4, 40] } })] });

  // ---------------------------------------------------------------- mobility, stretch & yoga
  X('Mobility', 'catcow', 'Cat-cow', '🐈', 'Spine',
    ['On hands and knees.', 'Inhale: drop the belly, lift your head (cow).', 'Exhale: round your back, tuck your chin (cat).'],
    { dur: 3, frames: [quad({ t: 84, head: -25, hip: [0, 21] }), quad({ t: 78, head: 35, hip: [0, 22.5] })] });
  X('Mobility', 'inch', 'Inchworm', '🐛', 'Hamstrings · core · shoulders',
    ['Stand, fold forward, hands to the floor.', 'Walk your hands out to a high plank.', 'Walk them back and stand up.'],
    { dur: 3.4, frames: [pose({ hip: [-39, 41], t: 160, ll: { ik: [-40.5, 0] }, rl: { ik: [-37.5, 0] }, la: { ik: [-26, 0] }, ra: { ik: [-24, 0] }, head: 10 }), TOP] });
  X('Mobility', 'wgsL', "World's greatest stretch", '🌍', 'Hips · hamstrings · upper back',
    ['Step into a deep lunge, hands on the floor.', 'Drop your elbow towards your front instep.', 'Rotate and reach that arm up to the sky. Switch sides.'],
    { dur: 3, frames: [lunge(1.2, { t: 55, la: { ik: [16, 0], bend: 'b' }, ra: { ik: [18, 0], bend: 'b' } }), lunge(1.2, { t: 50, la: { ik: [16, 0], bend: 'b' }, ra: [178, 180] })] });
  alias('wgsR', 'wgsL', "World's greatest stretch");
  X('Stretch', 'quadL', 'Standing quad stretch', '🦩', 'Quads · hip flexors',
    ['Stand tall, hold a wall for balance if needed.', 'Pull one heel to your glutes.', 'Knees together, hips pushed slightly forward. Hold.'],
    { frames: [pose({ rl: [-6, 172], ra: { ik: [-3, 38], bend: 'b' }, la: [80, 85] })] });
  alias('quadR', 'quadL', 'Standing quad stretch');
  X('Stretch', 'ham', 'Seated hamstring stretch', '🙇', 'Hamstrings · lower back',
    ['Sit with legs straight out in front.', 'Hinge forward from the hips with a flat back.', 'Reach for your toes. Hold, breathe.'],
    { frames: [seated({ t: 58, ll: [91, 90], rl: [92, 91], la: { ik: [34, 4] }, ra: { ik: [36, 4] }, head: 8 })] });
  X('Stretch', 'hipL', 'Kneeling hip flexor stretch', '🧎', 'Hip flexors · quads',
    ['Kneel on one knee, other foot in front.', 'Tuck your pelvis and push hips forward gently.', 'Feel it in the front of the back hip. Hold.'],
    { frames: [pose({ hip: [-3, 21], t: -4, rl: { ik: [16, 0], bend: 'f' }, ll: [-16, -90], la: [10, 40], ra: [15, 45] })] });
  alias('hipR', 'hipL', 'Kneeling hip flexor stretch');
  X('Stretch', 'calfsL', 'Wall calf stretch', '🦶', 'Calves',
    ['Hands on a wall, one foot back.', 'Keep the back leg straight, heel down.', 'Lean in until you feel the calf. Hold.'],
    { props: [{ wall: 34 }], frames: [pose({ hip: [2, 38], t: 24, rl: { ik: [12, 0], bend: 'f' }, ll: { ik: [-20, 0] }, la: { ik: [33, 52] }, ra: { ik: [33, 55] } })] });
  alias('calfsR', 'calfsL', 'Wall calf stretch');
  X('Stretch', 'pigeonL', 'Pigeon stretch', '🕊️', 'Glutes · hips',
    ['From all fours, bring one knee forward behind your wrist.', 'Slide the other leg straight back.', 'Sink your hips down. Fold forward to go deeper.'],
    { frames: [pose({ hip: [0, 9], t: 14, rl: [70, -110], ll: [-84, -88], la: { ik: [14, 0], bend: 'b' }, ra: { ik: [16, 0], bend: 'b' } })] });
  alias('pigeonR', 'pigeonL', 'Pigeon stretch');
  X('Stretch', 'child', "Child's pose", '🧘', 'Back · hips',
    ['Kneel, big toes together, knees apart.', 'Sit back on your heels.', 'Reach your arms forward and rest your forehead down. Breathe.'],
    { frames: [pose({ hip: [0, 16], t: 112, ll: [40, -92], rl: [42, -90], la: { ik: [48, 1] }, ra: { ik: [50, 1] }, head: 10 })] });
  X('Yoga', 'cobra', 'Cobra', '🐍', 'Abs · chest · spine',
    ['Lie face down, hands under shoulders.', 'Press up to lift your chest, hips stay down.', 'Shoulders away from ears. Hold.'],
    { frames: [prone({ t: 52, la: { ik: [16, 0], bend: 'b' }, ra: { ik: [18, 0], bend: 'b' }, head: -10 })] });
  X('Yoga', 'downdog', 'Downward dog', '🐕', 'Hamstrings · calves · shoulders',
    ['From a plank, push hips up and back.', 'Straighten arms and legs, heels towards the floor.', 'Make an upside-down V. Breathe.'],
    { frames: [pose({ hip: [0, 37], t: 142, ll: { ik: [-24, 0] }, rl: { ik: [-22, 0] }, la: { ik: [21, 0] }, ra: { ik: [23, 0] }, head: 10 })] });
  X('Yoga', 'warrior2', 'Warrior II', '⚔️', 'Legs · hips · shoulders',
    ['Wide stance, front toes forward, back foot turned in.', 'Bend the front knee over the ankle.', 'Arms out long, gaze over your front hand. Hold.'],
    { front: true, frames: [pose({ hip: [0, 30], ll: { ik: [-26, 0] }, rl: { ik: [22, 0], bend: 'f' }, la: [-90, -90], ra: [90, 90] })] });
  X('Yoga', 'tree', 'Tree pose', '🌳', 'Balance · hips',
    ['Stand on one leg.', 'Place the other foot on your inner calf or thigh.', 'Hands to chest or overhead. Find a point to focus on.'],
    { front: true, frames: [pose({ ll: { ik: [-1, 0] }, rl: { ik: [-2, 24], bend: 'f' }, la: [176, 182], ra: [184, 178] })] });
  X('Yoga', 'chairpose', 'Chair pose', '🪑', 'Quads · glutes · shoulders',
    ['Feet together, sit back as if into a chair.', 'Reach arms overhead.', 'Weight in your heels. Hold.'],
    { frames: [squat(.55, { la: [150, 158], ra: [154, 162] })] });
  X('Yoga', 'fold', 'Forward fold', '🙇', 'Hamstrings · back',
    ['Stand, feet hip-width.', 'Hinge at the hips and let your upper body hang.', 'Bend knees a little if you need to. Relax your neck.'],
    { frames: [pose({ hip: [-5, 41], t: 168, la: { ik: [3, 1] }, ra: { ik: [5, 1] }, head: 10 })] });
  X('Yoga', 'mountain', 'Mountain / overhead reach', '🏔️', 'Posture · shoulders',
    ['Stand tall, feet together.', 'Reach both arms overhead.', 'Lengthen through your fingertips. Breathe.'],
    { dur: 3, frames: [pose({ la: [6, 6], ra: [4, 4] }), pose({ la: [178, 178], ra: [182, 182] })] });
  X('Yoga', 'butterfly', 'Butterfly stretch', '🦋', 'Inner thighs · hips',
    ['Sit, soles of the feet together.', 'Let your knees fall open.', 'Hold your feet and sit tall. Gently press knees down.'],
    { front: true, frames: [seated({ t: 0, ll: { ik: [-2, 1], bend: 'b' }, rl: { ik: [2, 1], bend: 'f' }, la: { ik: [-1, 3] }, ra: { ik: [1, 3] } })] });

  // ---------------------------------------------------------------- gym: dumbbells, barbell, cable
  const BENCH = { box: [-38, 12, 12] };
  const benchLie = o => Object.assign({ hip: [0, 16], t: -90, ll: { ik: [16, 0], bend: 'u' }, rl: { ik: [18, 0], bend: 'u' } }, o);
  X('Gym', 'bench', 'Barbell bench press', '🏋️', 'Chest · triceps · shoulders',
    ['Lie on the bench, eyes under the bar, feet flat.', 'Lower the bar to mid-chest with control.', 'Press straight up until arms are locked.'],
    { props: [BENCH, { bb: true }], dur: 2.4, frames: [benchLie({ la: { ik: [-27, 41] }, ra: { ik: [-26, 41] } }), benchLie({ la: { ik: [-25, 22], bend: 'd' }, ra: { ik: [-24, 22], bend: 'd' } })] }, 'barbell');
  X('Gym', 'dbpress', 'Dumbbell bench press', '🏋️', 'Chest · triceps',
    ['Lie on a bench, dumbbells above your chest.', 'Lower them to the sides of your chest.', 'Press up and slightly together.'],
    { props: [BENCH, { db: true }], dur: 2.4, frames: [benchLie({ la: { ik: [-27, 41] }, ra: { ik: [-26, 41] } }), benchLie({ la: { ik: [-25, 22], bend: 'd' }, ra: { ik: [-24, 22], bend: 'd' } })] }, 'dumbbells');
  X('Gym', 'ohp', 'Overhead press', '🏋️', 'Shoulders · triceps',
    ['Stand, bar at your collarbones, grip just outside shoulders.', 'Press the bar straight overhead, moving your head back slightly.', 'Lock out, then lower to your collarbones.'],
    { props: [{ bb: true }], dur: 2.2, frames: [pose({ la: { ik: [5, 70], bend: 'f' }, ra: { ik: [6, 70], bend: 'f' } }), pose({ la: { ik: [1, 98] }, ra: { ik: [2, 98] } })] }, 'barbell');
  X('Gym', 'dbshoulder', 'Dumbbell shoulder press', '🏋️', 'Shoulders · triceps',
    ['Stand or sit, dumbbells at shoulder height.', 'Press them overhead until arms are straight.', 'Lower back to shoulders with control.'],
    { props: [{ db: true }], dur: 2.2, frames: [pose({ la: { ik: [3, 70], bend: 'b' }, ra: { ik: [5, 70], bend: 'f' } }), pose({ la: { ik: [1, 98] }, ra: { ik: [3, 98] } })] }, 'dumbbells');
  X('Gym', 'row', 'Barbell row', '🏋️', 'Back · biceps',
    ['Hinge forward to about 45°, back flat, knees soft.', 'Pull the bar to your lower ribs.', 'Squeeze shoulder blades, lower slowly.'],
    { props: [{ bb: true }], dur: 2, frames: [pose({ hip: [-5, 38], t: 64, ll: { ik: [-1, 0], bend: 'f' }, rl: { ik: [1, 0], bend: 'f' }, la: [2, 2], ra: [4, 4] }),
      pose({ hip: [-5, 38], t: 64, ll: { ik: [-1, 0], bend: 'f' }, rl: { ik: [1, 0], bend: 'f' }, la: { ik: [12, 44], bend: 'u' }, ra: { ik: [13, 44], bend: 'u' } })] }, 'barbell');
  X('Gym', 'dbrow', 'One-arm dumbbell row', '🏋️', 'Back · biceps',
    ['One knee and hand on a bench, back flat.', 'Pull the dumbbell up to your hip.', 'Lower all the way. Switch sides.'],
    { props: [{ box: [8, 36, 18] }, { db: true }], dur: 2, frames: [pose({ hip: [0, 37], t: 78, ll: { ik: [-6, 0] }, rl: [80, -10], la: { ik: [31, 18], bend: 'b' }, ra: [2, 2] }),
      pose({ hip: [0, 37], t: 78, ll: { ik: [-6, 0] }, rl: [80, -10], la: { ik: [31, 18], bend: 'b' }, ra: { ik: [8, 38], bend: 'u' } })] }, 'dumbbells');
  X('Gym', 'deadlift', 'Deadlift', '🏋️', 'Glutes · hamstrings · back',
    ['Bar over mid-foot, grip just outside your knees.', 'Brace, flat back, push the floor away to stand.', 'Lock hips at the top, then hinge back down.'],
    { props: [{ bb: true }], dur: 2.6, frames: [pose({ hip: [-10, 25], t: 56, ll: { ik: [3, 0], bend: 'f' }, rl: { ik: [5, 0], bend: 'f' }, la: { ik: [6, 7] }, ra: { ik: [7, 7] } }),
      pose({ la: { ik: [3, 16] }, ra: { ik: [4, 16] } })] }, 'barbell');
  X('Gym', 'rdl', 'Romanian deadlift', '🏋️', 'Hamstrings · glutes',
    ['Stand holding the weight, knees soft.', 'Push hips back, sliding the weight down your thighs.', 'Feel the hamstrings stretch, then drive hips forward to stand.'],
    { props: [{ db: true }], dur: 2.6, frames: [pose({ la: [3, 3], ra: [4, 4] }), pose({ hip: [-10, 39], t: 78, ll: { ik: [-1, 0], bend: 'f' }, rl: { ik: [1, 0], bend: 'f' }, la: [2, 2], ra: [4, 4] })] }, 'dumbbells');
  X('Gym', 'backsquat', 'Barbell back squat', '🏋️', 'Quads · glutes',
    ['Bar on your upper back, feet shoulder-width.', 'Brace and sit down until thighs are parallel.', 'Drive up through mid-foot.'],
    { props: [{ bb: true }], dur: 2.6, frames: [squat(0, { la: [-120, 60], ra: [-110, 70] }), squat(1, { la: [-90, 95], ra: [-80, 100] })] }, 'barbell');
  X('Gym', 'goblet', 'Goblet squat', '🏋️', 'Quads · glutes',
    ['Hold a dumbbell or kettlebell at your chest.', 'Squat down between your knees.', 'Stand up, keeping the weight close.'],
    { props: [{ kb: true }], dur: 2.4, frames: [squat(0, { la: [40, 170], ra: [45, 168] }), squat(1, { la: [100, 175], ra: [105, 172] })] }, 'dumbbells');
  X('Gym', 'dblunge', 'Dumbbell lunges', '🏋️', 'Quads · glutes',
    ['Hold dumbbells at your sides.', 'Step back into a lunge, both knees at 90°.', 'Drive up and switch legs.'],
    { props: [{ db: true }], dur: 2.4, frames: [pose({ la: [2, 2], ra: [4, 4] }), lunge(1, { la: [2, 2], ra: [4, 4] })] }, 'dumbbells');
  X('Gym', 'curl', 'Biceps curl', '💪', 'Biceps',
    ['Stand, dumbbells at your sides, palms forward.', 'Curl up, elbows pinned to your sides.', 'Lower slowly all the way.'],
    { props: [{ db: true }], dur: 2, frames: [pose({ la: [2, 4], ra: [3, 6] }), pose({ la: [3, 158], ra: [4, 160] })] }, 'dumbbells');
  alias('hammer', 'curl', 'Hammer curl');
  X('Gym', 'triext', 'Overhead triceps extension', '💪', 'Triceps',
    ['Hold one dumbbell overhead with both hands.', 'Lower it behind your head, elbows pointing up.', 'Extend back up.'],
    { props: [{ kb: true }], dur: 2, frames: [pose({ la: [176, 178], ra: [178, 180] }), pose({ la: [172, -20], ra: [174, -18] })] }, 'dumbbells');
  X('Gym', 'pushdown', 'Cable triceps pushdown', '💪', 'Triceps',
    ['Face the cable, elbows tucked at your sides.', 'Push the handle down until arms are straight.', 'Let it back up to chest height, elbows still.'],
    { props: [{ anchor: [16, 92] }], dur: 1.8, frames: [pose({ t: 6, la: [8, 125], ra: [10, 128] }), pose({ t: 6, la: [6, 8], ra: [8, 10] })] }, 'cable');
  X('Gym', 'pulldown', 'Lat pulldown', '🏋️', 'Back · biceps',
    ['Sit with thighs under the pad, wide grip.', 'Pull the bar to your upper chest, chest up.', 'Let it back up with control.'],
    { props: [{ box: [-14, 6, 18] }, { anchor: [4, 98] }], dur: 2.2, frames: [pose({ hip: [-4, 21], t: -8, ll: { ik: [16, 0], bend: 'u' }, rl: { ik: [18, 0], bend: 'u' }, la: { ik: [2, 74] }, ra: { ik: [4, 74] } }),
      pose({ hip: [-4, 21], t: -14, ll: { ik: [16, 0], bend: 'u' }, rl: { ik: [18, 0], bend: 'u' }, la: { ik: [0, 52], bend: 'b' }, ra: { ik: [1, 52], bend: 'b' } })] }, 'cable');
  X('Gym', 'pullup', 'Pull-ups', '🧗', 'Back · biceps',
    ['Hang from a bar, hands just wider than shoulders.', 'Pull your chest up to the bar.', 'Lower all the way to a dead hang.'],
    { props: [{ bar: [3, 96] }], dur: 2.2, frames: [pose({ hip: [0, 46], ll: [-10, -25], rl: [-8, -22], la: { ik: [2, 96] }, ra: { ik: [4, 96] } }),
      pose({ hip: [0, 64], ll: [-10, -25], rl: [-8, -22], la: { ik: [2, 96], bend: 'b' }, ra: { ik: [4, 96], bend: 'b' } })] }, 'bar');
  alias('chinup', 'pullup', 'Chin-ups');
  X('Gym', 'latraise', 'Lateral raise', '🏋️', 'Shoulders',
    ['Stand, dumbbells at your sides.', 'Raise arms out to shoulder height, slight bend in elbows.', 'Lower slowly.'],
    { front: true, props: [{ db: true }], dur: 2, frames: [front({ la: [-14, -12], ra: [14, 12] }), front({ la: [-88, -90], ra: [88, 90] })] }, 'dumbbells');
  X('Gym', 'hipthrust', 'Hip thrust', '🏋️', 'Glutes',
    ['Upper back on a bench, bar over your hips.', 'Drive through heels to lift hips until level with knees.', 'Squeeze glutes hard, lower.'],
    { props: [{ box: [-44, -18, 16] }, { bb: true }], dur: 2.2, frames: [pose({ hip: [-2, 6], neck: [-26, 17], ll: { ik: [18, 0], bend: 'u' }, rl: { ik: [20, 0], bend: 'u' }, la: { ik: [-1, 11], bend: 'u' }, ra: { ik: [0, 11], bend: 'u' } }),
      pose({ hip: [0, 21], neck: [-26, 18], ll: { ik: [18, 0], bend: 'u' }, rl: { ik: [20, 0], bend: 'u' }, la: { ik: [1, 26], bend: 'u' }, ra: { ik: [2, 26], bend: 'u' } })] }, 'barbell');
  X('Gym', 'legpress', 'Leg press', '🏋️', 'Quads · glutes',
    ['Sit in the machine, feet shoulder-width on the platform.', 'Lower until knees are near 90°.', 'Press back up without locking knees.'],
    { props: [{ box: [-30, 0, 12] }], dur: 2.4, frames: [pose({ hip: [-6, 14], t: -45, ll: { ik: [18, 32], bend: 'u' }, rl: { ik: [20, 33], bend: 'u' }, la: [40, 60], ra: [45, 65] }),
      pose({ hip: [-6, 14], t: -45, ll: { ik: [30, 46] }, rl: { ik: [32, 47] }, la: [40, 60], ra: [45, 65] })] }, 'machine');

  EX.rest = { n: 'Rest', e: '😮‍💨', muscles: '', steps: ['Shake it out and breathe.'], cue: 'Shake it out.', fig: { frames: [pose({ la: [10, 20], ra: [5, 15] })] }, equip: 'none', cat: 'Rest' };
})();

const EX_CATS = ['Cardio', 'Legs', 'Upper body', 'Core', 'Mobility', 'Stretch', 'Yoga', 'Gym'];
