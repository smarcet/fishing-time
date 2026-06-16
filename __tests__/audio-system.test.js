'use strict';

// Load constants into global scope (same pattern as all other test files)
require('../index.js');
const { AudioSystem } = require('../src/AudioSystem');

let mockAudioInstance;

beforeEach(() => {
  mockAudioInstance = { play: jest.fn().mockResolvedValue(undefined), pause: jest.fn() };
  global.Audio = jest.fn(() => mockAudioInstance);
});

afterEach(() => {
  delete global.Audio;
});

describe('AudioSystem SFX mapping', () => {
  test('enemyCaptured event plays fish.mp3', () => {
    const sys = new AudioSystem();
    sys._handleCapture();
    expect(global.Audio).toHaveBeenCalledWith('sfx/fish.mp3');
    expect(mockAudioInstance.play).toHaveBeenCalled();
    sys.destroy();
  });

  test('enemyHooked event plays bite.mp3', () => {
    const sys = new AudioSystem();
    sys._handleHooked();
    expect(global.Audio).toHaveBeenCalledWith('sfx/bite.mp3');
    expect(mockAudioInstance.play).toHaveBeenCalled();
    sys.destroy();
  });

  test('rodCasted event plays cast.mp3', () => {
    const sys = new AudioSystem();
    sys._handleCast();
    expect(global.Audio).toHaveBeenCalledWith('sfx/cast.mp3');
    expect(mockAudioInstance.play).toHaveBeenCalled();
    sys.destroy();
  });

  test('reelRetrieving event plays fishing-reel.mp3', () => {
    const sys = new AudioSystem();
    sys._handleReel();
    expect(global.Audio).toHaveBeenCalledWith('sfx/fishing-reel.mp3');
    expect(mockAudioInstance.play).toHaveBeenCalled();
    sys.destroy();
  });

  test('hookIdle event pauses and clears reel audio', () => {
    const sys = new AudioSystem();
    sys._handleReel();
    expect(sys._reelAudio).not.toBeNull();
    sys._handleIdle();
    expect(mockAudioInstance.pause).toHaveBeenCalled();
    expect(sys._reelAudio).toBeNull();
    sys.destroy();
  });
});

describe('AudioSystem destroy', () => {
  test('destroy removes all 5 listeners from document', () => {
    const savedDoc = global.document;
    global.document = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
    const sys = new AudioSystem();
    sys.destroy();
    expect(global.document.removeEventListener).toHaveBeenCalledTimes(5);
    global.document = savedDoc;
  });
});
