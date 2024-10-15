// ==UserScript==
// @name         Auto-Fishing
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a button to automatically fish with all your pets
// @author       Pan
// @match        https://www.neopets.com/water/fishing.phtml*
// @grant GM_setValue
// @grant GM_getValue
// @grant GM.setValue
// @grant GM.getValue
// @grant GM_deleteValue
// @grant GM_openInTab
// ==/UserScript==





(function () {
    'use strict';

    const minClickTiming = 1000;
    const maxClickTiming = 2000;

    function delay() {
        return new Promise((resolve, reject) => {
            setTimeout(function () {
                resolve(); // Signal that the operation is complete
            }, Math.round(minClickTiming + Math.random() * (maxClickTiming - minClickTiming)));
        });
    }

    function getPetNameFromFishingScreen() {
        // Get all elements that might contain the fishing skill text
        const elements = document.querySelectorAll('td, p, span, div');

        // Regular expression to match "<PetName>'s fishing skill is <number>."
        const regex = /([A-Za-z0-9_-]+)'s fishing skill is \d+\./;

        let petName = null;

        // Iterate over the elements to find a match
        elements.forEach(element => {
            const text = element.textContent.trim();
            const match = regex.exec(text);
            if (match && match[1]) {
                petName = match[1];
                console.log('Pet Name Found:', petName);
            }
        });

        if (!petName) {
            console.log('Pet name not found.');
        }

        return petName;
    }

    function getPets() {
        return new Promise((resolve, reject) => {
            let pets = [];
            $.ajax({
                url: "https://www.neopets.com/quickref.phtml", // Shoutouts to Luxittarius
                method: "GET",
                success: function (data) {
                    console.log("succesful query")
                    $(data).find(".pet_toggler img").each(function () {
                        let name = $(this).attr("title");
                        pets.push(name);
                    });
                    console.log(pets)
                    resolve(pets);
                }
            });
        });
    }

    function changePet(petName) {
        return new Promise((resolve, reject) => {
            const newTab = GM_openInTab('https://www.neopets.com/process_changepet.phtml?new_active_pet=' + petName, { active: false, insert: true });

            setTimeout(function () {
                newTab.close();
                console.log('New tab closed.');
                resolve(); // Signal that the operation is complete
            }, 500);
        });
    }

    window.addEventListener('load', async function () {
        const isRunning = await GM.getValue("isRunning", false);

        // Find the "Reel In Your Line" button
        const reelInButton = document.querySelector('input[value="Reel In Your Line"]');

        const castAgainLink = document.querySelector('a[href="/water/fishing.phtml"]');

        function addCustomButton() {
            // Check if the custom button already exists to prevent duplicates
            if (document.getElementById('customReelInButton')) {
                return;
            }

            if (reelInButton) {
                // Create a new input element of type "button"
                const customButton = document.createElement('input');
                customButton.id = 'customReelInButton';
                customButton.type = 'button';

                if (isRunning) {
                    customButton.value = 'Stop Fishing';
                } else {
                    customButton.value = 'Reel In All Your Lines';
                }

                // Copy the class list from the original button
                customButton.className = reelInButton.className;

                // Insert the custom button after the original button
                reelInButton.parentNode.insertBefore(customButton, reelInButton.nextSibling);

                // Add an event listener to the custom button
                customButton.addEventListener('click', async function () {
                    if (!isRunning) {
                        await GM.setValue('isRunning', true);
                        await GM.setValue('hasFished', false);

                        let pets = await getPets();
                        await GM.setValue('pets', pets);

                        let initialPet = getPetNameFromFishingScreen();
                        await GM.setValue('initialPet', initialPet);

                        await changePet(pets[0]);
                        await GM.setValue('currentPet', 0);
                        location.reload();
                    } else {
                        const initialPet = await GM.getValue('initialPet', getPetNameFromFishingScreen());
                        await GM.deleteValue('isRunning');
                        await GM.deleteValue('hasFished');
                        await GM.deleteValue('pets');
                        await GM.deleteValue('initialPet');
                        await GM.deleteValue('currentPet');
                        await changePet(initialPet);
                        await delay();
                        location.reload();
                    }
                });
            }
        }
        addCustomButton();

        if (isRunning) {
            const hasFished = await GM.getValue('hasFished');
            const pets = await GM.getValue('pets');
            const currentPet = await GM.getValue('currentPet');

            if (!reelInButton && castAgainLink) {
                await GM.setValue('hasFished', true);
                await delay();
                castAgainLink.click();

            } else if (reelInButton && !hasFished) {
                await delay();
                reelInButton.click();

            } else if (reelInButton && hasFished) {
                const lastPet = pets.length - 1;
                if (currentPet == lastPet) {
                    const initialPet = await GM.getValue('initialPet', getPetNameFromFishingScreen());

                    await GM.deleteValue('isRunning');
                    await GM.deleteValue('hasFished');
                    await GM.deleteValue('pets');
                    await GM.deleteValue('initialPet');
                    await GM.deleteValue('currentPet');

                    await changePet(initialPet);
                    location.reload();
                } else {
                    await changePet(pets[currentPet + 1]);
                    await GM.setValue('hasFished', false);
                    await GM.setValue('currentPet', currentPet + 1);
                    location.reload()
                }
            }
        }

    });
})();


