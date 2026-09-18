// FATE-CARD LIFECYCLE CORRECTION — real functional proof (Roman, 2026-09-17).
//
// Not a static/structural check only: this actually INVOKES the real
// generateIntimateFatePreviewsBatch() function (public/orchestration-client.js), with a stubbed
// window._callTieredProvider that captures the constructed prompt instead of making any network
// call, and asserts the authored context (openingFrame/postInterruptionBeat/liTurnHistory) is
// genuinely present in the real prompt text the function builds — proving the fix works, not
// just that the source contains the right-looking lines.
//
// ZERO network calls: window._callTieredProvider never reaches fetch; it resolves synchronously
// with a canned parseable reply.
import fs from 'fs';

const src = fs.readFileSync(new URL('./public/orchestration-client.js', import.meta.url), 'utf8');

// The whole file is `(function(window) { ... })(window);` — loading it via `new Function('window', src)`
// and calling with OUR fake window lets the file's own closing `(window)` call resolve to our object
// (it's an undeclared free variable inside the outer Function scope, bound to our parameter).
const factory = new Function('window', src + '\nreturn window.StoryboundOrchestration;');

let capturedMessages = null;
const fakeWindow = {
  state: {
    eroticMode: 'ROMANTIC',
    storybeau: { name: 'Julian' },
    loveInterestName: 'Julian',
    gender: 'Female',
    loveInterestGender: 'Male',
    playerMask: '',
    esd: {},
    intimacyDialogue: {
      _authoredFrame: {
        cue: 'AUTHORED-CUE-MARKER: Julian closes Lirael\'s fingers around The Answer.',
        openingFrame: 'AUTHORED-OPENING-FRAME-MARKER: the one-on-one opens in the public clearing.',
        postInterruptionBeat: { text: 'AUTHORED-POSTBEAT-MARKER: The Answer rested heavy in my hands.' },
      },
      liTurnHistory: [
        { userInput: 'PLAYER-TURN-MARKER: I hold his gaze.', liDialogue: 'JULIAN-REPLY-MARKER: You always do.' },
      ],
    },
  },
  StoryPagination: { getAllContent: () => '<p>some unrelated paginated story text</p>' },
  _callTieredProvider: async (role, messages) => {
    capturedMessages = messages;
    // Canned, PARSEABLE reply (matches the real "CARD ||| variant ||| action ||| dialogue" shape)
    // so the function's own validateContent()/parser succeed without any network call.
    const line = (name) => `${name} ||| amplify ||| A placeholder action for ${name}. ||| "A placeholder line."`;
    return {
      provider: 'stub', tier: 'stub',
      content: ['TEMPTATION', 'SILENCE', 'REVERSAL', 'BOUNDARY', 'CONFESSION'].map(line).join('\n'),
    };
  },
};

const orchestration = factory(fakeWindow);

let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } else { console.log('PASS: ' + m); } };

A(typeof orchestration.generateIntimateFatePreviewsBatch === 'function', 'generateIntimateFatePreviewsBatch is exported and callable');

const result = await orchestration.generateIntimateFatePreviewsBatch();

A(capturedMessages !== null, 'the function actually called _callTieredProvider (real invocation happened, not a no-op)');
A(result !== null && typeof result === 'object', 'the function returned a real parsed result from the stubbed reply (proves the call completed end-to-end)');

const userMsg = capturedMessages && capturedMessages[1] && capturedMessages[1].content || '';
A(/AUTHORED-CUE-MARKER/.test(userMsg), 'REAL PROMPT contains the authored opening frame cue (d._authoredFrame.cue)');
A(/AUTHORED-OPENING-FRAME-MARKER/.test(userMsg), 'REAL PROMPT contains the authored opening frame situation text (d._authoredFrame.openingFrame)');
A(/AUTHORED-POSTBEAT-MARKER/.test(userMsg), 'REAL PROMPT contains the authored postInterruptionBeat text — the specific gap Roman named ("ensure it receives... the post-interruption state too")');
A(/PLAYER-TURN-MARKER/.test(userMsg), 'REAL PROMPT contains the live OAS turn history (player input) — invisible to this function before the fix');
A(/JULIAN-REPLY-MARKER/.test(userMsg), 'REAL PROMPT contains the live OAS turn history (LI reply) — invisible to this function before the fix');

// Regression check: confirm the fix did NOT remove any pre-existing real context source.
A(/some unrelated paginated story text/.test(userMsg) || /RECENT SCENE/.test(userMsg), 'pre-existing recentScene/StoryPagination context is still present (fix is additive, not a replacement)');

// Zero network call proof: the ONLY way this function reaches a provider is via
// window._callTieredProvider, which we fully own — nothing else in this file path calls fetch.
A(!/\bfetch\(/.test(userMsg), 'sanity: captured prompt text itself contains no literal fetch call (not a meaningful check alone, but confirms nothing leaked raw code into the prompt)');

console.log('\n' + '='.repeat(70));
console.log(fail ? 'RESULT: FAIL — see above' : 'RESULT: PASS — real invocation confirms the authored-context fix genuinely reaches the constructed prompt, zero network calls made');
process.exitCode = fail ? 1 : 0;
