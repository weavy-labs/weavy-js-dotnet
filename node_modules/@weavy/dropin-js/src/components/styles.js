import { TonalPalette } from "@material/material-color-utilities/dist/palettes/tonal_palette";
import { Hct } from "@material/material-color-utilities/dist/hct/hct";
import { argbFromHex, hexFromArgb } from "@material/material-color-utilities/dist/utils/string_utils";
import { Blend } from "@material/material-color-utilities/dist/blend/blend";
import WeavyConsole from '../utils/console';
import WeavyEvents from "../utils/events";

const console = new WeavyConsole("Styles")

export function applyStyleSheet(root, stylesheet) {
  // Prefer modern CSS registration
  if (WeavyStyles.supportsConstructableStyleSheets) {
    root.adoptedStyleSheets = Array.prototype.concat.call(root.adoptedStyleSheets, [stylesheet]);
  } else {
    // Fallback CSS registration
    (root === document ? document.head : root).appendChild(stylesheet);
  }
}

export function createStyleSheet(css) {
  // Prefer modern CSS registration
  if (WeavyStyles.supportsConstructableStyleSheets) {
    let sheet = new CSSStyleSheet();
    css && updateStyleSheet(sheet, css);
    return sheet;
  } else {
    // Fallback CSS registration
    let elementStyleSheet = document.createElement("style");
    elementStyleSheet.dataset.weavy = true;
    css && updateStyleSheet(elementStyleSheet, css);
    return elementStyleSheet;
  }
}

export function updateStyleSheet(styleSheet, css) {
    // Prefer modern CSS registration
    if (WeavyStyles.supportsConstructableStyleSheets) {
      styleSheet.replaceSync(css);
    } else {
      // Fallback CSS registration
      styleSheet.replaceChildren(document.createTextNode(css));
    }
}

/**
 * @class WeavyStyles

 * @classdesc
 * Style manager for weavy used in weavy dom-root
 * 
 * 
 * @property {string} id - The id of the root.
 * @property {Element} parent - The parent DOM node where the root is attached.
 * @property {Element} section - The &lt;weavy/&gt; node which is the placeholder for the root. Attached to the parent.
 * @property {Element} root - The the &lt;weavy-root/&gt; that acts as root. May contain a ShadowDOM if supported.
 * @property {ShadowDOM|Element} dom - The ShadowDOM if supported, otherwise the same as root. The ShadowDOM is closed by default.
 * @property {Element} container - The &lt;weavy-container/&gt; where you safely can place elements. Attached to the dom.
 * @example
 * ```html
 * <style>
 *   .wy-container {
 *    // The .wy- selector will be recognized by weavy and the stylesheet will inserted into all weavy roots
 *    ...
 *   }
 * </style>
 * ```
 */
export default class WeavyStyles extends WeavyEvents {

  /**
   * Is constructable stylesheets supported by the browser?
   * @memberof WeavyStyles.
   * @static 
   * @type {boolean}
   */
  static supportsConstructableStyleSheets = 'adoptedStyleSheets' in document;

  /**
   * The node where external styles are calculated from.
   * @private
   * @type {HTMLElement}
   */
  #element;

  /**
   * The external styles found.
   * @private
   * @type {String}
   */
  #externalCss;

  /**
   * The font applied in the parent.
   * @private
   * @type {String}
   */
  #externalFont;

  /**
   * The meta theme-color applied in the parent.
   * @private
   * @type {String}
   */
  #externalColor;

  /**
   * The external CSS custom properties found.
   * @private
   * @type {String}
   */
  #externalVars;

  /**
   * The custom styles set.
   * @private
   * @type {String}
   */
  #css = '';

  get css() {
    return this.#css;
  }

  set css(css) {
    this.#css = css

    // Check if we have a new color?
    this.#updateExternalColor();

    this.styleSheets.custom ??= createStyleSheet();
    updateStyleSheet(this.styleSheets.custom, css);

    this.#showAnyErrors(this.#element.id, "Some stylesheets could not be processed");
  }

   /**
    * List of any errors that has occurred during stylesheet processing. 
    * @private
    * @type {{name: string, error: string}[]}
    */
  #styleSheetErrors = [];

  /**
   * List of all added stylesheets.
   * @private
   * @type {Array.<string>}
   */
  styleSheets = {};

  /**
   * Creates a sealed shadow DOM and injects additional styles into the created root.
   * @param {Weavy} weavy - Weavy instance
   * @param {HTMLElement} element - The root element from where external styles are fetched.
   */
  constructor(element, eventParent) {
    super();

    this.#element = element;

    if (eventParent) {
      this.eventParent = eventParent;
    }

    this.updateStyles();
  }

  updateStyles() {
    console.log("Updating styles");

    this.triggerEvent("before:styles-update");

    //if (this.#weavy.options.includeFont) {
      this.#updateExternalFont();
    //}
    
    this.#updateExternalStyles();

    //if (this.#weavy.options.includeThemeColor) {
      this.#updateExternalColor();
    //}

    queueMicrotask(() => {
      this.triggerEvent("on:styles-update");  
      this.#showAnyErrors("Some stylesheets could not be processed");
      this.triggerEvent("after:styles-update");
    })
  }

  #updateExternalFont() {
    this.#externalFont = getComputedStyle(this.#element).fontFamily;

    if (this.#externalFont) {
      console.debug("Setting root font.");
      let fontCSS = `:host > * {--wy-font-family:${this.#externalFont}; font-family: var(--wy-font-family); }`;
      this.styleSheets.font ??= createStyleSheet()
      updateStyleSheet(this.styleSheets.font, fontCSS);
    }
  }

  #updateExternalColor() {
    var themeColor;

    // Check for theme color in custom css
    let themeColorMatch = [...(this.#css).matchAll(/--wy-theme-color\s*:\s*(#[a-f\d]{6});/ig)]?.pop();
    if (themeColorMatch) {
      console.debug("Found theme color in custom css.", themeColorMatch);
      themeColor = themeColorMatch[1];
    }

    if(!themeColor) {
      // By inherited --wy-theme
      themeColor = getComputedStyle(this.#element).getPropertyValue("--wy-theme-color");
    }

    if (!themeColor) {
      // By meta theme-color
      let metaThemeColors = Array.from(document.head.querySelectorAll("meta[name='theme-color']"));
      themeColor = metaThemeColors.filter((meta) => {
        // Only use matching media if defined
        let metaMedia = meta.getAttribute("media");
        return !metaMedia || window.matchMedia(metaMedia)?.matches;
      }).pop()?.getAttribute("content");
    }

    this.#externalColor = themeColor;
  }

  #updateExternalStyles() {
    this.#externalCss = "";
    this.#externalVars = "";

    var possibleExternalVars = [];

    // Gather possible custom properties from DOM parents
    for (var parent = { parentElement: this.#element }; (parent = parent.parentElement);) {
      for (var style of parent.style) {
        if (style.startsWith('--wy-')) {
          possibleExternalVars.push(style);
        }
      }
    }

    // Check stylesheets
    for (let sheet of document.styleSheets) {
      try {
        if (!sheet.ownerNode?.dataset.weavy && sheet instanceof CSSStyleSheet && sheet.cssRules) {
          for (let rule of sheet.cssRules) {
            if (!rule.parentRule) {
              // Look for .wy- selectors
              if (rule.cssText.includes('.wy-')) {
                console.debug("Found external rule", rule.cssText)
                this.#externalCss += rule.cssText + "\n";
              }
              // Look for --wy- custom properties
              if (rule.cssText.includes('--wy-')) {
                for (let style of rule.style) { 
                  if (style.startsWith('--wy-')) {
                    possibleExternalVars.push(style);
                  } 
                }
              }

            }
          }
        }
      } catch(e) {
        this.#styleSheetErrors.push({name: sheet.href || sheet.ownerNode.nodeName, error: e.toString()});
      }
    }
    
    // Try possible custom properties and add them if available to parent
    let parentStyles = getComputedStyle(this.#element);
    
    possibleExternalVars.forEach((varName) => {
      let varValue = parentStyles.getPropertyValue(varName);
      if (varValue) {
        let externalVar = `${varName}:${varValue};`;
        console.debug("Found external custom property", externalVar)
        this.#externalVars += externalVar;
      } 
    })

    this.styleSheets.external ??= createStyleSheet()
    updateStyleSheet(this.styleSheets.external, this.#externalCss)
  }

  getAllCSS() {
    var rootFont = this.#externalFont ? `:root{--wy-font-family:${this.#externalFont};}` : '';
    var rootVars = this.#externalVars ? `:root{ ${this.#externalVars} }` : '';
    var rootColors = '';

    if (this.#externalColor) {
      let colors = [];
      colors.push(`--wy-theme-color:${this.#externalColor};`); 
      
      // Get the theme from a hex color
      let argb = argbFromHex(this.#externalColor);

      // Custom color theme assuming our main Weavy color when choosing secondary and tertiary
      // Weavy #156b93 ~ HCT(238, 48, 40) => #00658e
      // Colors are taken from Hue division by 16
      // Red HSL Hue 0deg = HCT Hue 27,4deg

      const hct = Hct.fromInt(argb);
      const hue = hct.hue;
      const chroma = hct.chroma;

      const maxChroma = Math.max(48, chroma); 
      const colorChroma = Math.min(maxChroma, 84); // Google suggests 84 for Error

      const divisions = 16.0; // Number of colors
      const colorGap = 360.0 / divisions; // Degrees between hue colors
      const redZero = 27.4; // HCT.FromInt(unchecked(0xff0000));
      const hueOffset = -8.0; // Average offset for the color wheel

      const redHue = ((hue + 360.0 - redZero - hueOffset + (colorGap / 2)) % colorGap) + redZero + hueOffset - (colorGap / 2);

      let palette = {
        "primary": TonalPalette.fromHueAndChroma(hue, maxChroma),
        "secondary": TonalPalette.fromHueAndChroma(hue, maxChroma / 3),
        "tertiary": TonalPalette.fromHueAndChroma(hue + 60, maxChroma / 2),
        "neutral": TonalPalette.fromHueAndChroma(hue, Math.min(chroma / 12, 4)),
        "neutral-variant": TonalPalette.fromHueAndChroma(hue, Math.min(chroma / 6, 8)),
        "error": TonalPalette.fromHueAndChroma(redHue, 84),

        "red": TonalPalette.fromHueAndChroma(redHue, colorChroma),
        "deep-orange": TonalPalette.fromHueAndChroma(redHue + 1 * colorGap, colorChroma),
        "orange": TonalPalette.fromHueAndChroma(redHue + 2 * colorGap, colorChroma),
        "amber": TonalPalette.fromHueAndChroma(redHue + 3 * colorGap, colorChroma),
        "yellow": TonalPalette.fromHueAndChroma(redHue + 4 * colorGap, colorChroma),
        "lime": TonalPalette.fromHueAndChroma(redHue + 5 * colorGap, colorChroma),
        "light-green": TonalPalette.fromHueAndChroma(redHue + 6 * colorGap, colorChroma),
        "green": TonalPalette.fromHueAndChroma(redHue + 7 * colorGap, colorChroma),
        "teal": TonalPalette.fromHueAndChroma(redHue + 8 * colorGap, colorChroma),
        "cyan": TonalPalette.fromHueAndChroma(redHue + 9 * colorGap, colorChroma),
        "light-blue": TonalPalette.fromHueAndChroma(redHue + 10 * colorGap, colorChroma),
        "blue": TonalPalette.fromHueAndChroma(redHue + 11 * colorGap, colorChroma),
        "indigo": TonalPalette.fromHueAndChroma(redHue + 12 * colorGap, colorChroma),
        "deep-purple": TonalPalette.fromHueAndChroma(redHue + 13 * colorGap, colorChroma),
        "purple": TonalPalette.fromHueAndChroma(redHue + 14 * colorGap, colorChroma),
        "pink": TonalPalette.fromHueAndChroma(redHue + 15 * colorGap, colorChroma),
        "gray": TonalPalette.fromHueAndChroma(hue, 4)
      };
        
      let allTones = {
        //"100": 100,
        "99": 99,
        "95": 95,
        "90": 90,
        "80": 80,
        "70": 70,
        "60": 60,
        "50": 50,
        "40": 40,
        "30": 30,
        "20": 20,
        "10": 10
        //"0": 0
      };

      let colorToneMap = {
        "primary": allTones,
        "secondary": allTones,
        "tertiary": allTones,
        "neutral": allTones,
        "neutral-variant": allTones,
        "error": allTones,
        "blue" : { light: 70, dark: 80 },
        "indigo" : { light: 60, dark: 60 },
        "purple" : { light: 60, dark: 70 },
        "pink" : { light: 60, dark: 70 },
        "red" : { light: 60, dark: 60 },
        "orange" : { light: 70, dark: 70 },
        "yellow" : { light: 80, dark: 80 },
        "green" : { light: 60, dark: 60 },
        "teal" : { light: 60, dark: 60 },
        "cyan" : { light: 50, dark: 60 },
        "gray": { light: 50, dark: 60 }
      }

      console.debug("theme color", this.#externalColor);

      for (let colorName in colorToneMap) {
        let tones = colorToneMap[colorName];
        for (let tone in tones) {
          let hex = hexFromArgb(palette[colorName].tone(tones[tone]));
          colors.push(`--wy-${colorName}-${tone}:${hex};`);
        }
      }

      // Surface Tones
      let tint = {
        light: palette.primary.tone(40),
        dark: palette.primary.tone(80)
      }

      let surface = {
        light: palette.neutral.tone(99),
        dark: palette.neutral.tone(10)
      };

      let surfaces = {
        "surface-1": { light: Blend.cam16Ucs(surface.light, tint.light, .05), dark: Blend.cam16Ucs(surface.dark, tint.dark, .05) },
        "surface-2": { light: Blend.cam16Ucs(surface.light, tint.light, .08), dark: Blend.cam16Ucs(surface.dark, tint.dark, .08) },
        "surface-3": { light: Blend.cam16Ucs(surface.light, tint.light, .11), dark: Blend.cam16Ucs(surface.dark, tint.dark, .11) },
        "surface-4": { light: Blend.cam16Ucs(surface.light, tint.light, .12), dark: Blend.cam16Ucs(surface.dark, tint.dark, .12) },
        "surface-5": { light: Blend.cam16Ucs(surface.light, tint.light, .14), dark: Blend.cam16Ucs(surface.dark, tint.dark, .14) },
      };
      
      for (let colorName in surfaces) {
        let tones = surfaces[colorName];
        for (let tone in tones) {
          let hex = hexFromArgb(tones[tone]);
          colors.push(`--wy-${colorName}-${tone}:${hex};`);
        }
      }

      rootColors = `:root{${colors.join('')}}`;
    }

    let combinedCSS = [rootFont, rootColors, this.#externalCss, rootVars, this.#css].filter((s) => s).join("\n");

    // Move @imports to the top
    let foundImports = []
    combinedCSS = combinedCSS.replace(/@import\s+\S*;?/gm, (match) => { foundImports.push(match); return ""; });
    combinedCSS = foundImports.join("\n") + combinedCSS;

    return combinedCSS;
  }
  
  /**
   * 
   * @param  {...any} labels - Any messages to put before the error listing
   */
  #showAnyErrors(...labels) {
    if (this.#styleSheetErrors.length) {

      console.error(...labels);
      this.#styleSheetErrors.forEach((e) => console.warn(e.name.toString(), e.error.toString()));

      this.#styleSheetErrors = [];
    }
  }
}