(() => {
    console.log(`Compare Settings injected`);
    if(location.href.match(/\/wp-admin\//)){
        const wpSettings = new Array;
        const inputs = Array.from(document.getElementById("wpbody").querySelectorAll("input,select")).filter(input => input.id);
        inputs.forEach((input,i) => {
            const label = document.querySelector(`label[for="${input.id}"]`) ? document.querySelector(`label[for="${input.id}"]`).innerText : "";
            if(!label) return;
            const id = `#${input.id}`;
            input = input.querySelector("option[selected='selected']") ? input.querySelector("option[selected='selected']").innerText : input;
            if(input.type === "checkbox") input = input.checked ? 'Checked' : 'Unchecked';
            const settingsObject = {
                setting: label,
                value: typeof input === "string" ? input : input.value,
                selector:id
            };
            wpSettings[i] = settingsObject;
        });
        console.log(wpSettings);
        return wpSettings;
    }else if(location.href.match(/console.theplatform.com/)){
        const cvpSettings = new Array;
        const selectorClass = ".Container-sc-sc-wiilmn";
        document.querySelectorAll(selectorClass).forEach((div,i) => {
            const label = div.querySelector("label") ? div.querySelector("label").innerText : "";
            if(!label) return;
            let value = new String;
            if(div.querySelector("textarea")) value = div.querySelector("textarea").innerText;
            else if(div.querySelector("input")) value = div.querySelector("input").value;
            else if(div.querySelector("div[data-e2e='tick-icon']")) value = div.querySelector("div[data-e2e='tick-icon']").value ? 'Checked' : 'Unchecked';
            if(label) cvpSettings[i] = {
                setting:label,
                value:value,
                selector:selectorClass
            };
        });
        console.log(cvpSettings);
        return cvpSettings;
    }
})();