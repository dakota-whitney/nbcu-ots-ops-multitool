(() => {
    console.log(`Get Settings injected`);
    if(location.href.match(/\/wp-admin\//)){
        const wpSettings = new Array;
        const inputs = Array.from(document.getElementById("wpbody").querySelectorAll("input,select")).filter(input => input.type !== 'submit' && input.id);
        let label = "";
        inputs.forEach((input,i) => {
            label = document.querySelector(`label[for="${input.id}"]`) ? document.querySelector(`label[for="${input.id}"]`).innerText : label;
            const id = `#${input.id}`;
            if(input.querySelector("option[selected]")) input = input.querySelector("option[selected]").innerText;
            if(input.type === "checkbox") input = input.checked ? 'Checked' : 'Unchecked';
            input = typeof input === "string" ? input : input.value;
            const settingsObject = new Object;
            if(label) settingsObject.setting = label;
            settingsObject.value = input;
            settingsObject.selector = id;
            wpSettings[i] = settingsObject;
        });
        console.log(wpSettings);
        return wpSettings;
    }else if(location.href.match(/console.theplatform.com/)){
        const cvpSettings = new Array;
        const selectorClass = ".Container-sc-sc-wiilmn";
        document.querySelectorAll(selectorClass).forEach((div,i) => {
            const label = div.querySelector("label") ? div.querySelector("label").innerText : "";
            let value = "";
            if(div.querySelector("textarea")) value = div.querySelector("textarea").innerText;
            else if(div.querySelector("input")) value = div.querySelector("input").value;
            else if(div.querySelector("div[data-e2e='tick-icon']")) value = div.querySelector("div[data-e2e='tick-icon']").value ? 'Checked' : 'Unchecked';
            const settingsObject = new Object;
            if(label) settingsObject.setting = label;
            settingsObject.value = value;
            settingsObject.selector = selectorClass;
            cvpSettings[i] = settingsObject;
        });
        console.log(cvpSettings);
        return cvpSettings;
    }
})();