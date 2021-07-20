import * as TestLogic from "./test-logic";
import * as TestUI from "./test-ui";
import * as TestStats from "./test-stats";
import * as Monkey from "./monkey";
import Config, * as UpdateConfig from "./config";
import * as Keymap from "./keymap";
import * as Misc from "./misc";
import * as LiveAcc from "./live-acc";
import * as LiveBurst from "./live-burst";
import * as Funbox from "./funbox";
import * as Sound from "./sound";
import * as Caret from "./caret";
import * as ManualRestart from "./manual-restart-tracker";
import * as Notifications from "./notifications";
import * as CustomText from "./custom-text";
import * as UI from "./ui";
import * as Settings from "./settings";
import * as LayoutEmulator from "./layout-emulator";
import * as PaceCaret from "./pace-caret";
import * as TimerProgress from "./timer-progress";
import * as TestTimer from "./test-timer";
import * as Focus from "./focus";
import * as ShiftTracker from "./shift-tracker";
import * as Replay from "./replay.js";
import * as MonkeyPower from "./monkey-power";
import * as WeakSpot from "./weak-spot";

let dontInsertSpace = false;
let inputValueBeforeChange = "";

function handleTab(event) {
  if (TestUI.resultCalculating) {
    event.preventDefault();
  }
  if ($("#customTextPopup .textarea").is(":focus")) {
    event.preventDefault();

    let area = $("#customTextPopup .textarea")[0];

    var start = area.selectionStart;
    var end = area.selectionEnd;

    // set textarea value to: text before caret + tab + text after caret
    area.value =
      area.value.substring(0, start) + "\t" + area.value.substring(end);

    // put caret at right position again
    area.selectionStart = area.selectionEnd = start + 1;

    return;
  } else if (
    !TestUI.resultCalculating &&
    $("#commandLineWrapper").hasClass("hidden") &&
    $("#simplePopupWrapper").hasClass("hidden") &&
    !$(".page.pageLogin").hasClass("active")
  ) {
    if ($(".pageTest").hasClass("active")) {
      if (Config.quickTab) {
        if (
          TestUI.resultVisible ||
          !(
            (Config.mode == "zen" && !event.shiftKey) ||
            (TestLogic.hasTab && !event.shiftKey)
          )
        ) {
          if (event.shiftKey) ManualRestart.set();
          event.preventDefault();
          if (
            TestLogic.active &&
            Config.repeatQuotes === "typing" &&
            Config.mode === "quote"
          ) {
            TestLogic.restart(true, false, event);
          } else {
            TestLogic.restart(false, false, event);
          }
        } else {
          event.preventDefault();
          triggerInputWith("\t");
        }
      } else if (!TestUI.resultVisible) {
        if (
          (TestLogic.hasTab && event.shiftKey) ||
          (!TestLogic.hasTab && Config.mode !== "zen") ||
          (Config.mode === "zen" && event.shiftKey)
        ) {
          event.preventDefault();
          $("#restartTestButton").focus();
        } else {
          event.preventDefault();
          triggerInputWith("\t");
        }
      }
    } else if (Config.quickTab) {
      UI.changePage("test");
    }
  }
}

function setupBackspace(event) {
  if (!TestLogic.active) return;

  Sound.playClick(Config.playSoundOnClick);

  if (
    TestLogic.input.current.length > 0 ||
    TestLogic.input.history.length == 0 ||
    TestUI.currentWordElementIndex == 0
  )
    return;

  if (
    (TestLogic.input.history[TestLogic.words.currentIndex - 1] ==
      TestLogic.words.get(TestLogic.words.currentIndex - 1) &&
      !Config.freedomMode) ||
    $($(".word")[TestLogic.words.currentIndex - 1]).hasClass("hidden")
  ) {
    event.preventDefault();
    return;
  }

  if (Config.confidenceMode === "on" || Config.confidenceMode === "max") {
    event.preventDefault();
    return;
  }

  TestLogic.input.current = TestLogic.input.popHistory();
  TestLogic.corrected.popHistory();

  if (Config.funbox !== "nospace") {
    TestLogic.input.current += " ";
  }

  TestLogic.words.decreaseCurrentIndex();
  TestUI.setCurrentWordElementIndex(TestUI.currentWordElementIndex - 1);
  TestUI.updateActiveElement(true);
  Funbox.toggleScript(TestLogic.words.getCurrent());

  if (Config.keymapMode === "react") {
    Keymap.flashKey(event.code, true);
  } else if (Config.keymapMode === "next" && Config.mode !== "zen") {
    Keymap.highlightKey(
      TestLogic.words
        .getCurrent()
        .substring(
          TestLogic.input.current.length,
          TestLogic.input.current.length + 1
        )
        .toString()
        .toUpperCase()
    );
  }
}

function handleSpace() {
  if (!TestLogic.active) return;

  const inputWord = TestLogic.input.current.slice(0, -1);

  // handleLastChar() will decide if it gets inserted as character on start of word or not
  if (inputWord === "") return;

  if (Config.mode == "zen") {
    $("#words .word.active").removeClass("active");
    $("#words").append("<div class='word active'></div>");
  }

  let currentWord = TestLogic.words.getCurrent();
  if (Config.funbox === "layoutfluid" && Config.mode !== "time") {
    // here I need to check if Config.customLayoutFluid exists because of my scuffed solution of returning whenever value is undefined in the setCustomLayoutfluid function
    const layouts = Config.customLayoutfluid
      ? Config.customLayoutfluid.split("#")
      : ["qwerty", "dvorak", "colemak"];
    let index = 0;
    let outof = TestLogic.words.length;
    index = Math.floor(
      (TestLogic.input.history.length + 1) / (outof / layouts.length)
    );
    if (Config.layout !== layouts[index] && layouts[index] !== undefined) {
      Notifications.add(`--- !!! ${layouts[index]} !!! ---`, 0);
    }
    UpdateConfig.setLayout(layouts[index]);
    UpdateConfig.setKeymapLayout(layouts[index]);
    Keymap.highlightKey(
      TestLogic.words
        .getCurrent()
        .substring(inputWord.length, inputWord.length + 1)
        .toString()
        .toUpperCase()
    );
    Settings.groups.layout.updateButton();
  }
  dontInsertSpace = true;

  let burst = TestStats.calculateBurst();
  LiveBurst.update(Math.round(burst));
  TestStats.pushBurstToHistory(burst);

  //correct word or in zen mode
  const isWordCorrect = currentWord == inputWord || Config.mode == "zen";
  MonkeyPower.addPower(isWordCorrect, true);
  TestStats.incrementAccuracy(isWordCorrect);
  if (isWordCorrect) {
    PaceCaret.handleSpace(true, currentWord);
    TestLogic.input.current = inputWord;
    TestLogic.input.pushHistory();
    TestLogic.words.increaseCurrentIndex();
    TestUI.setCurrentWordElementIndex(TestUI.currentWordElementIndex + 1);
    TestUI.updateActiveElement();
    Funbox.toggleScript(TestLogic.words.getCurrent());
    Caret.updatePosition();
    TestStats.incrementKeypressCount();
    TestStats.pushKeypressWord(TestLogic.words.currentIndex);
    if (Config.funbox !== "nospace") {
      Sound.playClick(Config.playSoundOnClick);
    }
    Replay.addReplayEvent("submitCorrectWord");
  } else {
    if (Config.funbox !== "nospace") {
      if (!Config.playSoundOnError || Config.blindMode) {
        Sound.playClick(Config.playSoundOnClick);
      } else {
        Sound.playError(Config.playSoundOnError);
      }
    }
    TestStats.pushMissedWord(TestLogic.words.getCurrent());
    TestStats.incrementKeypressErrors();
    let cil = inputWord.length;
    if (cil <= TestLogic.words.getCurrent().length) {
      if (cil >= TestLogic.corrected.current.length) {
        TestLogic.corrected.current += "_";
      } else {
        TestLogic.corrected.current =
          TestLogic.corrected.current.substring(0, cil) +
          "_" +
          TestLogic.corrected.current.substring(cil + 1);
      }
    }
    if (Config.stopOnError != "off") {
      if (Config.difficulty == "expert" || Config.difficulty == "master") {
        //failed due to diff when pressing space
        TestLogic.fail("difficulty");
        return;
      }
      if (Config.stopOnError == "word") {
        TestLogic.input.current += " ";
        Replay.addReplayEvent("incorrectLetter", "_");
        TestUI.updateWordElement(true);
        Caret.updatePosition();
      }
      return;
    }
    PaceCaret.handleSpace(false, currentWord);
    if (Config.blindMode) $("#words .word.active letter").addClass("correct");
    TestLogic.input.current = inputWord;
    TestLogic.input.pushHistory();
    TestUI.highlightBadWord(TestUI.currentWordElementIndex, !Config.blindMode);
    TestLogic.words.increaseCurrentIndex();
    TestUI.setCurrentWordElementIndex(TestUI.currentWordElementIndex + 1);
    TestUI.updateActiveElement();
    Funbox.toggleScript(TestLogic.words.getCurrent());
    Caret.updatePosition();
    TestStats.incrementKeypressCount();
    TestStats.pushKeypressWord(TestLogic.words.currentIndex);
    TestStats.updateLastKeypress();
    if (Config.difficulty == "expert" || Config.difficulty == "master") {
      TestLogic.fail("difficulty");
      return;
    } else if (TestLogic.words.currentIndex == TestLogic.words.length) {
      //submitted last word that is incorrect
      TestLogic.finish();
      return;
    }
    Replay.addReplayEvent("submitErrorWord");
  }

  let wordLength;
  if (Config.mode === "zen") {
    wordLength = inputWord;
  } else {
    wordLength = TestLogic.words.getCurrent().length;
  }

  let flex = Misc.whorf(Config.minBurstCustomSpeed, wordLength);
  if (
    (Config.minBurst === "fixed" && burst < Config.minBurstCustomSpeed) ||
    (Config.minBurst === "flex" && burst < flex)
  ) {
    TestLogic.fail("min burst");
    return;
  }

  TestLogic.corrected.pushHistory();

  if (
    !Config.showAllLines ||
    Config.mode == "time" ||
    (CustomText.isWordRandom && CustomText.word == 0) ||
    CustomText.isTimeRandom
  ) {
    let currentTop = Math.floor(
      document.querySelectorAll("#words .word")[
        TestUI.currentWordElementIndex - 1
      ].offsetTop
    );
    let nextTop;
    try {
      nextTop = Math.floor(
        document.querySelectorAll("#words .word")[
          TestUI.currentWordElementIndex
        ].offsetTop
      );
    } catch (e) {
      nextTop = 0;
    }

    if (nextTop > currentTop && !TestUI.lineTransition) {
      TestUI.lineJump(currentTop);
    }
  } //end of line wrap

  // Caret.updatePosition();

  if (Config.keymapMode === "react") {
    Keymap.flashKey("Space", true);
  } else if (Config.keymapMode === "next" && Config.mode !== "zen") {
    Keymap.highlightKey(
      TestLogic.words
        .getCurrent()
        .substring(inputWord.length, inputWord.length + 1)
        .toString()
        .toUpperCase()
    );
  }
  if (
    Config.mode === "words" ||
    Config.mode === "custom" ||
    Config.mode === "quote" ||
    Config.mode === "zen"
  ) {
    TimerProgress.update(TestTimer.time);
  }
  if (
    Config.mode == "time" ||
    Config.mode == "words" ||
    Config.mode == "custom"
  ) {
    TestLogic.addWord();
  }
}

function handleLastChar() {
  if (TestUI.resultCalculating || TestUI.resultVisible) {
    TestLogic.input.dropLastChar();
    return;
  }

  let char =
    TestLogic.input.current[TestLogic.input.current.length - 1];

  if (char === "\n" && Config.funbox === "58008") {
    char = " ";
  }

  if (char === " ") {
    handleSpace();

    //insert space for expert and master or strict space,
    //otherwise dont do anything
    if (Config.difficulty !== "normal" || Config.strictSpace) {
      if (dontInsertSpace) {
        dontInsertSpace = false;
        TestLogic.input.dropLastChar();
        return;
      }
    } else {
      TestLogic.input.dropLastChar();
      return;
    }
  }

  //start the test
  if (!TestLogic.active && !TestLogic.startTest()) {
    TestLogic.input.dropLastChar();
    return;
  }

  if (TestLogic.input.current == "") {
    TestStats.setBurstStart(performance.now());
  }

  Focus.set(true);
  Caret.stopAnimation();

  //check if the char typed was correct
  let thisCharCorrect;
  let nextCharInWord;
  if (Config.mode != "zen") {
    nextCharInWord = TestLogic.words
      .getCurrent()
      .substring(
        TestLogic.input.current.length,
        TestLogic.input.current.length + 1
      );
  }

  if (nextCharInWord == event["key"]) {
    thisCharCorrect = true;
  } else {
    thisCharCorrect = false;
  }

  if (Config.language.split("_")[0] == "russian") {
    if ((char === "е" || char === "e") && nextCharInWord == "ё") {
      char = nextCharInWord;
      thisCharCorrect = true;
    }
    if (
      char === "ё" &&
      (nextCharInWord == "е" || nextCharInWord === "e")
    ) {
      char = nextCharInWord;
      thisCharCorrect = true;
    }
  }

  if (Config.mode == "zen") {
    thisCharCorrect = true;
  }

  if (char === "’" && nextCharInWord == "'") {
    char = "'";
    thisCharCorrect = true;
  }

  if (char === "'" && nextCharInWord == "’") {
    char = "’";
    thisCharCorrect = true;
  }

  if (char === "”" && nextCharInWord == '"') {
    char = '"';
    thisCharCorrect = true;
  }

  if (char === '"' && nextCharInWord == "”") {
    char = "”";
    thisCharCorrect = true;
  }

  if ((char === "–" || char === "—") && nextCharInWord == "-") {
    char = "-";
    thisCharCorrect = true;
  }

  if (!thisCharCorrect && Misc.trailingComposeChars.test(char)) return;

  MonkeyPower.addPower(thisCharCorrect);
  TestStats.incrementAccuracy(thisCharCorrect);

  if (!thisCharCorrect) {
    TestStats.incrementKeypressErrors();
    TestStats.pushMissedWord(TestLogic.words.getCurrent());
  }
  WeakSpot.updateScore(
    TestLogic.words.getCurrent().charAt(TestLogic.input.current.length - 1),
    thisCharCorrect
  );

  if (thisCharCorrect) {
    Sound.playClick(Config.playSoundOnClick);
  } else {
    if (!Config.playSoundOnError || Config.blindMode) {
      Sound.playClick(Config.playSoundOnClick);
    } else {
      Sound.playError(Config.playSoundOnError);
    }
  }

  //update current corrected version. if its empty then add the current char. if its not then replace the last character with the currently pressed one / add it
  if (TestLogic.corrected.current === "") {
    TestLogic.corrected.current = TestLogic.input.current;
  } else {
    let cil = TestLogic.input.current.length;
    if (cil >= TestLogic.corrected.current.length) {
      TestLogic.corrected.current += char;
    } else if (!thisCharCorrect) {
      TestLogic.corrected.current =
        TestLogic.corrected.current.substring(0, cil) +
        char +
        TestLogic.corrected.current.substring(cil + 1);
    }
  }

  TestStats.incrementKeypressCount();
  TestStats.updateLastKeypress();
  TestStats.pushKeypressWord(TestLogic.words.currentIndex);

  if (Config.stopOnError == "letter" && !thisCharCorrect) {
    TestLogic.input.dropLastChar();
    return;
  }

  Replay.addReplayEvent(
    thisCharCorrect ? "correctLetter" : "incorrectLetter",
    char
  );

  //update the active word top, but only once
  if (
    TestLogic.input.current.length === 2 &&
    TestLogic.words.currentIndex === 0
  ) {
    TestUI.setActiveWordTop(document.querySelector("#words .active").offsetTop);
  }

  //max length of the input is 20 unless in zen mode then its 30
  if (Config.mode == "zen") {
    TestLogic.input.current = TestLogic.input.current.substring(0, 30);
  } else {
    TestLogic.input.current = TestLogic.input.current.substring(
      0,
      TestLogic.words.getCurrent().length + 20
    );
  }

  if (!thisCharCorrect && Config.difficulty == "master") {
    TestLogic.fail("difficulty");
    return;
  }

  //keymap
  if (Config.keymapMode === "react") {
    Keymap.flashKey(char, thisCharCorrect);
  } else if (Config.keymapMode === "next" && Config.mode !== "zen") {
    Keymap.highlightKey(
      TestLogic.words
        .getCurrent()
        .substring(
          TestLogic.input.current.length,
          TestLogic.input.current.length + 1
        )
        .toString()
        .toUpperCase()
    );
  }

  if (Config.mode != "zen") {
    //not applicable to zen mode
    //auto stop the test if the last word is correct
    let currentWord = TestLogic.words.getCurrent();
    let lastindex = TestLogic.words.currentIndex;
    if (
      (currentWord == TestLogic.input.current ||
        (Config.quickEnd &&
          currentWord.length == TestLogic.input.current.length &&
          Config.stopOnError == "off")) &&
      lastindex == TestLogic.words.length - 1
    ) {
      TestLogic.input.pushHistory();
      TestLogic.corrected.pushHistory();
      TestLogic.finish();
    }
  }

  let activeWordTopBeforeJump = TestUI.activeWordTop;
  TestUI.updateWordElement();
  let newActiveTop = document.querySelector("#words .word.active").offsetTop;
  //stop the word jump by slicing off the last character, update word again
  if (
    activeWordTopBeforeJump < newActiveTop &&
    !TestUI.lineTransition &&
    TestLogic.input.current.length > 1
  ) {
    if (Config.mode == "zen") {
      let currentTop = Math.floor(
        document.querySelectorAll("#words .word")[
          TestUI.currentWordElementIndex - 1
        ].offsetTop
      );
      if (!Config.showAllLines) TestUI.lineJump(currentTop);
    } else {
      TestLogic.input.dropLastChar();
      TestUI.updateWordElement();
    }
  }

  //simulate space press in nospace funbox
  if (
    (Config.funbox === "nospace" &&
      TestLogic.input.current.length ===
        TestLogic.words.getCurrent().length) ||
    (char === "\n" && thisCharCorrect)
  ) {
    TestLogic.input.current += " ";
    setTimeout(handleSpace, 0);
  }
}

$(document).keyup((event) => {
  if (!event.originalEvent.isTrusted) return;

  if (TestUI.resultVisible) return;
  let now = performance.now();
  let diff = Math.abs(TestStats.keypressTimings.duration.current - now);
  if (TestStats.keypressTimings.duration.current !== -1) {
    TestStats.pushKeypressDuration(diff);
  }
  TestStats.setKeypressDuration(now);
  Monkey.stop();
});

$(document).keydown(function (event) {
  if (!event.originalEvent.isTrusted) return;

  if (!TestUI.resultVisible) {
    TestStats.recordKeypressSpacing();
  }

  Monkey.type();

  //autofocus
  let pageTestActive = !$(".pageTest").hasClass("hidden");
  let commandLineVisible = !$("#commandLineWrapper").hasClass("hidden");
  let leaderboardsVisible = !$("#leaderboardsWrapper").hasClass("hidden");
  let wordsFocused = $("#wordsInput").is(":focus");
  let modePopupVisible =
    !$("#customTextPopupWrapper").hasClass("hidden") ||
    !$("#customWordAmountPopupWrapper").hasClass("hidden") ||
    !$("#customTestDurationPopupWrapper").hasClass("hidden") ||
    !$("#quoteSearchPopupWrapper").hasClass("hidden") ||
    !$("#wordFilterPopupWrapper").hasClass("hidden");
  if (
    pageTestActive &&
    !commandLineVisible &&
    !leaderboardsVisible &&
    !modePopupVisible &&
    !TestUI.resultVisible &&
    !wordsFocused &&
    event.key !== "Enter"
  ) {
    TestUI.focusWords();
    wordsFocused = true;
    if (Config.showOutOfFocusWarning) return;
  }

  //tab
  if (
    (event.key == "Tab" && !Config.swapEscAndTab) ||
    (event.key == "Escape" && Config.swapEscAndTab)
  ) {
    handleTab(event);
  }

  //blocking firefox from going back in history with backspace
  if (event.key === "Backspace" && wordsFocused) {
    let t = /INPUT|SELECT|TEXTAREA/i;
    if (
      !t.test(event.target.tagName) ||
      event.target.disabled ||
      event.target.readOnly
    ) {
      event.preventDefault();
    }
  }

  TestStats.setKeypressDuration(performance.now());

  if (TestUI.testRestarting) {
    return;
  }

  // TODO: caps lock backspace
  //const isBackspace =
  //  event.key === "Backspace" ||
  //  (Config.capsLockBackspace && event.key === "CapsLock");
  const isBackspace = event.key === "Backspace";

  if (isBackspace && wordsFocused) {
    setupBackspace(event);
  }

  if (event.key === "Enter") {
    if (event.shiftKey && Config.mode == "zen") {
      TestLogic.finish();
    }
    if (
      event.shiftKey &&
      ((Config.mode == "time" && Config.time === 0) ||
        (Config.mode == "words" && Config.words === 0))
    ) {
      TestLogic.setBailout(true);
      TestLogic.finish();
    }
  }

  //show dead keys
  if (
    event.key === "Dead" &&
    !Misc.trailingComposeChars.test(TestLogic.input.current)
  ) {
    Sound.playClick(Config.playSoundOnClick);
    $(
      document.querySelector("#words .word.active").querySelectorAll("letter")[
        TestLogic.input.current.length
      ]
    ).toggleClass("dead");
    return;
  }

  if (
    [
      "ContextMenu",
      "Escape",
      "Shift",
      "Control",
      "Meta",
      "Alt",
      "AltGraph",
      "CapsLock",
      "Backspace",
      "PageUp",
      "PageDown",
      "Home",
      "ArrowUp",
      "ArrowLeft",
      "ArrowRight",
      "ArrowDown",
      "OS",
      "Insert",
      "Home",
      "Undefined",
      "Control",
      "Fn",
      "FnLock",
      "Hyper",
      "NumLock",
      "ScrollLock",
      "Symbol",
      "SymbolLock",
      "Super",
      "Unidentified",
      "Process",
      "Delete",
      "KanjiMode",
      "Pause",
      "PrintScreen",
      "Clear",
      "End",
      "GroupPrevious",
      "GroupNext",
      undefined,
    ].includes(event.key)
  ) {
    TestStats.incrementKeypressMod();
  }
});

function triggerInputWith(string) {
  $("#wordsInput").trigger("beforeinput");
  TestLogic.input.current += string;
  $("#wordsInput").trigger("input");
}

$("#wordsInput").on("beforeinput", function (event) {
  inputValueBeforeChange = event.target.value.normalize();
});

$("#wordsInput").on("input", function (event) {
  if (TestUI.testRestarting) return;

  // if characters inserted or replaced
  if (
    TestLogic.input.current.length >= inputValueBeforeChange.length ||
    TestLogic.input.current !== inputValueBeforeChange.slice(0, TestLogic.input.current.length)
  ) {
    handleLastChar();
  } else {
    TestUI.updateWordElement();
  }

  setTimeout(Caret.updatePosition, 0);

  let acc = Misc.roundTo2(TestStats.calculateAccuracy());
  LiveAcc.update(acc);

  // force caret at end of input
  // doing it on next cycle because Chromium on Android won't let me edit
  // the selection inside the input event
  setTimeout(() => {
    if (
      event.target.selectionStart !== event.target.value.length &&
      (!Misc.trailingComposeChars.test(event.target.value) ||
        event.target.selectionStart <
          event.target.value.search(Misc.trailingComposeChars))
    ) {
      event.target.selectionStart = event.target.selectionEnd =
        event.target.value.length;
    }
  }, 0);
});
