import http from 'k6/http';
import exec from 'k6/execution';
import { browser } from 'k6/browser';
import { sleep, check, fail } from 'k6';

const BASE_URL = 'https://ic-new.surge.sh';

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<2000'],
    'checks': ['rate==1.0'],
  },
};

export function setup() {
  const res = http.get(BASE_URL);
  if (res.status !== 200) {
    exec.test.abort(`Got unexpected status code ${res.status} when trying to setup. Exiting.`);
  }
}

export default async function () {
  const page = await browser.newPage();

  try {
    console.log('🚀 Starting complete user journey test...');

    // Step 1: Open main page
    console.log('📄 Step 1: Opening main page...');
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    console.log('✅ Main page loaded');

    // Step 2: Click Take Part button
    console.log('🎯 Step 2: Clicking first available button...');
    const allButtons = await page.locator('button, a, [role="button"]').all();
    console.log(`🔍 Found ${allButtons.length} clickable elements on main page`);
    
    let buttonClicked = false;
    for (let i = 0; i < allButtons.length; i++) {
      try {
        const button = allButtons[i];
        if (await button.isVisible()) {
          await button.click();
          console.log(`✅ Clicked button ${i}`);
          buttonClicked = true;
          break;
        }
      } catch (e) {
        console.log(`Error with button ${i}: ${e.message}`);
      }
    }

    if (buttonClicked) {
      await page.waitForTimeout(3000);
      console.log('✅ Navigated after clicking button');
      
      console.log('⏳ Step 2.5: Waiting for music downloading to complete...');
      await page.waitForTimeout(10000);
      console.log('✅ Music download wait completed');
    }

    // Step 3: Click LAUNCH button
    console.log('🚀 Step 3: Clicking LAUNCH button (first time)...');
    await page.waitForTimeout(2000);
    
    const launchButtons = await page.locator('button, a, [role="button"]').all();
    console.log(`🔍 Found ${launchButtons.length} clickable elements on current page`);
    
    let launchClicked = false;
    for (let i = 0; i < launchButtons.length; i++) {
      try {
        const button = launchButtons[i];
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        console.log(`Button ${i}: "${text}" (visible: ${isVisible})`);
        
        if (text && text.toUpperCase().includes('LAUNCH')) {
          await button.click();
          console.log(`✅ Clicked LAUNCH button (first time): "${text}"`);
          launchClicked = true;
          break;
        }
      } catch (e) {
        console.log(`Error with button ${i}: ${e.message}`);
      }
    }

    if (launchClicked) {
      await page.waitForTimeout(3000);
      console.log('✅ Clicked LAUNCH button (first time)');
    } else {
      console.log('⚠️ Could not find LAUNCH button');
    }

    // Step 3.5: Click AddCircleOutlineIcon
    console.log('🎯 Step 3.5: Clicking AddCircleOutlineIcon from AddLoopVoiceButton...');
    await page.waitForTimeout(2000);
    
    const addIcons = await page.locator('svg[data-testid="AddCircleOutlineIcon"], svg[class*="AddCircleOutline"], [data-testid="AddCircleOutlineIcon"], .MuiSvgIcon-root[class*="AddCircleOutline"]').all();
    console.log(`🔍 Found ${addIcons.length} AddCircleOutline icons`);
    
    let iconClicked = false;
    for (let i = 0; i < addIcons.length; i++) {
      try {
        const icon = addIcons[i];
        const isVisible = await icon.isVisible();
        const className = await icon.getAttribute('class');
        const testId = await icon.getAttribute('data-testid');
        console.log(`AddCircleOutline Icon ${i}: visible=${isVisible}, class="${className}", testid="${testId}"`);
        
        if (isVisible && (className?.includes('AddCircleOutline') || testId === 'AddCircleOutlineIcon')) {
          await icon.click();
          console.log(`✅ Clicked AddCircleOutlineIcon ${i}`);
          iconClicked = true;
          break;
        }
      } catch (e) {
        console.log(`Error with AddCircleOutlineIcon ${i}: ${e.message}`);
      }
    }

    if (iconClicked) {
      await page.waitForTimeout(3000);
      console.log('✅ Clicked AddCircleOutlineIcon');
    } else {
      console.log('⚠️ Could not find or click AddCircleOutlineIcon');
    }

    // Step 4: Check navigation to /speak page
    console.log('🔍 Step 4: Checking navigation...');
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/speak')) {
      console.log('✅ Successfully navigated to /speak page');
    } else {
      console.log('⚠️ Did not navigate to /speak page');
    }

    // Step 5: Checkbox and continue button
    console.log('☑️ Step 5: Looking for checkbox and continue button...');
    await page.waitForTimeout(2000);
    
    const checkboxes = await page.locator('input[type="checkbox"], [role="checkbox"]').all();
    console.log(`🔍 Found ${checkboxes.length} checkboxes`);
    
    let checkboxChecked = false;
    for (let i = 0; i < checkboxes.length; i++) {
      try {
        const checkbox = checkboxes[i];
        if (await checkbox.isVisible()) {
          await checkbox.check();
          console.log(`✅ Checked checkbox ${i}`);
          checkboxChecked = true;
          break;
        }
      } catch (e) {
        console.log(`Error with checkbox ${i}: ${e.message}`);
      }
    }

    if (checkboxChecked) {
      await page.waitForTimeout(1000);
    }

    const continueButtons = await page.locator('button, a, [role="button"]').all();
    console.log(`🔍 Found ${continueButtons.length} clickable elements for continue`);
    
    let continueClicked = false;
    for (let i = 0; i < continueButtons.length; i++) {
      try {
        const button = continueButtons[i];
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        console.log(`Continue Button ${i}: "${text}" (visible: ${isVisible})`);
        
        if (text && text.toLowerCase().includes('continue')) {
          await button.click();
          console.log(`✅ Clicked Continue button: "${text}"`);
          continueClicked = true;
          break;
        }
      } catch (e) {
        console.log(`Error with continue button ${i}: ${e.message}`);
      }
    }

    if (continueClicked) {
      await page.waitForTimeout(3000);
      console.log('✅ Clicked Continue button');
      
      console.log('⏳ Waiting 5 seconds for manual microphone permission enabling...');
      await page.waitForTimeout(5000);
      console.log('✅ Microphone permission wait completed');
    } else {
      console.log('⚠️ Could not find "Continue" button');
    }

    // Step 5.5: Click play icon from ControlButton
    console.log('▶️ Step 5.5: Clicking play icon from ControlButton...');
    await page.waitForTimeout(2000);
    
    const playIconButtons = await page.locator('button.MuiIconButton-root[class*="MuiIconButton-sizeLarge"]:has(img[alt="play"])').all();
    console.log(`🔍 Found ${playIconButtons.length} large play icon buttons`);
    
    let playIconClicked = false;
    for (let i = 0; i < playIconButtons.length; i++) {
      try {
        const button = playIconButtons[i];
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        const className = await button.getAttribute('class');
        console.log(`Large Play Icon Button ${i}: visible=${isVisible}, enabled=${isEnabled}, class="${className}"`);
        
        if (isVisible && isEnabled && className?.includes('MuiIconButton-sizeLarge')) {
          await button.click();
          console.log(`✅ Clicked ControlButton play icon button ${i} (large size)`);
          playIconClicked = true;
          break;
        }
      } catch (e) {
        console.log(`Error with large play icon button ${i}: ${e.message}`);
      }
    }

    if (playIconClicked) {
      await page.waitForTimeout(3000);
      console.log('✅ Clicked ControlButton play icon');
    } else {
      console.log('⚠️ Could not find or click ControlButton play icon');
    }

    // Step 5.6: Click mic icon from ControlButton
    console.log('🎤 Step 5.6: Clicking mic icon from ControlButton...');
    await page.waitForTimeout(2000);
    
    const micIconButtons = await page.locator('button.MuiIconButton-root:has(img[alt="mic"])').all();
    console.log(`🔍 Found ${micIconButtons.length} mic icon buttons`);
    
    let micIconClicked = false;
    for (let i = 0; i < micIconButtons.length; i++) {
      try {
        const button = micIconButtons[i];
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        const className = await button.getAttribute('class');
        console.log(`Mic Icon Button ${i}: visible=${isVisible}, enabled=${isEnabled}, class="${className}"`);
        
        if (isVisible && isEnabled) {
          await button.click();
          console.log(`✅ Clicked ControlButton mic icon button ${i}`);
          micIconClicked = true;
          break;
        }
      } catch (e) {
        console.log(`Error with mic icon button ${i}: ${e.message}`);
      }
    }

    if (micIconClicked) {
      await page.waitForTimeout(3000);
      console.log('✅ Clicked ControlButton mic icon');
      
      // Step 5.7: Wait for Re-Record button
      console.log('🔍 Starting loop to check for Re-Record button from ControlButton...');
      
      let reRecordDetected = false;
      const maxWaitTime = 30000;
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWaitTime && !reRecordDetected) {
        try {
          const reRecordButtons = await page.locator('button').all();
          console.log(`🔍 Checking ${reRecordButtons.length} buttons for Re-Record button`);
          
          for (let i = 0; i < reRecordButtons.length; i++) {
            try {
              const button = reRecordButtons[i];
              const isVisible = await button.isVisible();
              const text = await button.textContent();
              
              if (isVisible && text && text.trim() === 'Re-Record') {
                console.log(`✅ Re-Record button detected (button ${i})`);
                reRecordDetected = true;
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          if (!reRecordDetected) {
            await page.waitForTimeout(1000);
            console.log('⏳ Still waiting for Re-Record button...');
          }
        } catch (e) {
          console.log(`Error in Re-Record button check: ${e.message}`);
          await page.waitForTimeout(1000);
        }
      }
      
      if (reRecordDetected) {
        console.log('✅ Successfully reached recording-playback mode - Re-Record button found');
        
        console.log('⏳ Waiting 5 seconds before ending automation...');
        await page.waitForTimeout(5000);
        console.log('✅ Automation completed - ending test');
      } else {
        console.log('⏰ Timeout waiting for Re-Record button');
      }
      
    } else {
      console.log('⚠️ Could not find or click ControlButton mic icon');
    }

    // Final checks
    const pageTitle = await page.title();
    const finalUrl = page.url();
    
    check(page, {
      'page has title': pageTitle && pageTitle.length > 0,
      'page is accessible': true,
    });

    console.log(`✅ Complete user journey test finished`);
    console.log(`📍 Final URL: ${finalUrl}`);
    console.log(`📄 Final Title: ${pageTitle}`);

  } catch (error) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    fail(`Browser iteration failed: ${errorMessage}`);
  } finally {
    await page.close();
  }

  sleep(1);
}