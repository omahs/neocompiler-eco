function createCompilexJson(code_zip_list) {
    var compilexJson = new Object();
    compilexJson.compilers_versions = $("#compilers_versions-selection-box")[0].value;
    compilexJson.codesend_selected_compiler = $("#codesend_selected_compiler")[0].value;
    compilexJson.cbx_compatible = 1;
    compilexJson.codesend = code_zip_list;
    compilexJson.socketID = socketCompilers.id;
    return compilexJson;
}

function compilerCall() {
    $("#codewarnerr").val("Remote compiling at " + BASE_PATH_COMPILERS + "\n" + new Date());
    $("#compilebtn")[0].disabled = true;
    $("#compilers_server-selection-box")[0].disabled = true;
    $("#compilers_versions-selection-box")[0].disabled = true;
    code_cs = "";
    $("#codeavm").val("");
    $("#opcodes").val("");
    $("#codeabi").val("");
    $("#codemanifest").val("");
    $("#invokehashjs").val("");
    $("#contracthashjs").val("");
    $("#contractparams").val("\"\"");
    $("#selected_compiler_form").val(SELECTED_COMPILER);
    $('#collapseMore').collapse('hide');

    //e.preventDefault(); // Prevents the page from refreshing
    //
    //
    //var zip = new JSZip();
    //
    //zip.file("contract", openedSessions.get(-1).getValue());
    //
    // zip.file("contract", getAllSections());
    /*
    zip.generateAsync({
        type: "base64",
        compression: "DEFLATE",
        compressionOptions: {
            level: 9
        }
    }).then((code) => {
    */
    var xl = getAllSections(); // get all codes
    var xl_p = []; // store promises
    for (i in xl) {
        var zip = new JSZip();
        zip.file("contract_" + i, xl[i]);
        xl_p[i] = zip.generateAsync({
            type: "base64",
            compression: "DEFLATE",
            compressionOptions: {
                level: 9
            }
        });
    }
    // resolve all promises and launch
    Promise.all(xl_p).then((ace_sessions_code_zip_list) => {
        console.log(ace_sessions_code_zip_list);
        console.log("Compiling " + $("#codesend_selected_compiler")[0].value + " code...");

        var indata = createCompilexJson(ace_sessions_code_zip_list);
        console.log(indata);
        $.ajax({
            type: "POST",
            url: BASE_PATH_COMPILERS + "/compilex",
            data: indata,
            timeout: 360000, //5minutes
            dataType: "json",
            crossDomain: true
        }).done(function (data) {
            console.log("Waiting for socket response from my client: " + indata.socketID);
            $("#codewarnerr").val($("#codewarnerr").val() + "\nWaiting reply from socket connection : " + indata.socketID);
        })
            .fail(function (jqxhr, settings, ex) {
                if (jqxhr.status == 0 && jqxhr.readyState == 0) {
                    console.error("Restarting request");
                }
                swal("Failed" + ex + " Something went wrong while calling " + BASE_PATH_COMPILERS + "/compilex", {
                    icon: "error",
                    buttons: false,
                    timer: 2500,
                });
                console.log("Failed " + ex);
                console.log(ex);
                console.log(jqxhr);
                console.log(settings);
                $("#compilebtn")[0].disabled = false;
                $("#compilers_server-selection-box")[0].disabled = false;
                $("#compilers_versions-selection-box")[0].disabled = false;
                $("#codewarnerr").val("failed" + ex + "settings " + settings + " status " + jqxhr.status + " rs " + jqxhr.readyState);
                $("#codeavm").val("failed" + ex + "settings " + settings + " status " + jqxhr.status + " rs " + jqxhr.readyState);
                $("#opcodes").val("");
            });

        //Send info to EcoServices for counting number of compilations
        $.post(
            BASE_PATH_ECOSERVICES + "/compileCounter", // Gets the URL to sent the post to
            null, // Serializes form data in standard format
            function (data) { },
            "json" // The format the response should be in
        ); //End of POST for Compile counter
    });
}

function getAllSections() {
    var sessionValues = [];
    sessionValues.push(openedSessions.get(-1).getValue())
    for (var [key, value] of openedSessions) {
        if (key != -1)
            sessionValues.push(value.getValue());
    }
    return sessionValues;
}

function updateCompiledOrLoadedContractInfo(contractScriptHash, avmSize) {
    $("#contractInfo_ScriptHash")[0].value = contractScriptHash;
    $("#contractInfo_Address")[0].value = toBase58(contractScriptHash);
    //TODO
    //updateScriptHashesBoxes(contractScriptHash);

    // ------------------------------------------
    // calculating extra fee according to AVM size
    var fixedAVGTxSize = 500; //TODO
    $("#contractInfo_AVMSize")[0].value = avmSize;
    // TODO - Create a call on neo-plugins SimplePolicy
    var freeSize = 1024;
    var feePerExtraByte = 0.00001;
    var extraGasNetFeeForBigTx = 0;
    // TODO Extra size workaround due to inputs lenght
    var avmWithExtraSize = avmSize + fixedAVGTxSize;
    if (avmWithExtraSize > freeSize)
        extraGasNetFeeForBigTx = (avmWithExtraSize - freeSize) * feePerExtraByte;
    // Required deploy fee = Number(String(extraGasNetFeeForBigTx).slice(0, 10));
    // ------------------------------------------
}

function updateListOfAvailableCompilerVersion(language)
{
    if (language === "csharp") 
        updateCompilersSelectionBox("docker-mono-neo-compiler");

    if (language === "python")
        updateCompilersSelectionBox("docker-neo3-boa-compiler");
}
function setCompiler() {
    cleanAllSessionsInsteadOfMain();
    aceEditor.getSession().setValue("");

    if ($("#codesend_selected_compiler")[0].value === "C#")
        language = "csharp";

    if ($("#codesend_selected_compiler")[0].value === "Python")
        language = "python";

    var vExamples;
    SELECTED_COMPILER = language;
    
    //First, update list with all available versions
    updateListOfAvailableCompilerVersion(language);
    
    if (language === "csharp") {
        aceEditor.getSession().setMode("ace/mode/csharp");
        vExamples = cSharpFiles;
        $("#codesend_selected_compiler")[0].selectedIndex = 0;
        $("#mainTabAceEditor")[0].innerHTML = "Main.cs"
        //$("#cbx_example_name")[0].placeholder = "myexample.cs";
    }

    if (language === "python") {
        aceEditor.getSession().setMode("ace/mode/python");
        vExamples = cPythonFiles;
        $("#codesend_selected_compiler")[0].selectedIndex = 1;
        $("#mainTabAceEditor")[0].innerHTML = "Main.py"
        //$("#cbx_example_name")[0].placeholder = "myexample.cs";
    }

    var exampleListUl = document.getElementById("ExampleList");
    exampleListUl.innerHTML = ""
    for (var e = 0; e < vExamples.length; e++) {
        var exampleToAdd = document.createElement("option");
        exampleToAdd.setAttribute('value', e);

        // Not needed because of select onchange - DUPLICATED
        //var onClickFunction = 'setExample("' + language + '","' + e + '");';
        //exampleToAdd.setAttribute('onClick', onClickFunction)

        exampleToAdd.setAttribute('id', "loadedExample" + e);
        var cutSize = "./assets/sc_examples/" + language + "/";
        var nameToCut = vExamples[e][0];
        if (Array.isArray(nameToCut))
            nameToCut = nameToCut[0];
        var exampleName = nameToCut.slice(cutSize.length);
        var exampleInfo = "Selected code example is from " + language + ": " + exampleName;
        exampleToAdd.setAttribute('title', exampleInfo);
        exampleToAdd.appendChild(document.createTextNode(exampleName));
        exampleListUl.add(exampleToAdd);
    }

    //Checking all cookies
    var added = false;
    var keyToAdd = "";
    USER_EXAMPLES.forEach(function (value, key) {
        var contractMatchesLanguage = addCSContractFromLocalMap(value, key, language);
        if (contractMatchesLanguage) {
            added = true;
            if (keyToAdd === "")
                keyToAdd = key;
        }
    });
    if (!added) {
        setExample(language, 0);
    } else {
        restoreSCFromMapToAceEditor(keyToAdd);
        $("#ExampleList")[0].selectedIndex = $("#userContracts_" + keyToAdd)[0].index;
    }
};

function askForSavingContracts(changeToExample = true) {
    swal({
        title: "Want to save codes to local storage?",
        icon: "warning",
        buttons: ["No", "Yes"],
        timer: 15000,
    }).then((buttonOption) => {
        if (buttonOption) {
            swal({
                text: 'Contract name',
                content: "input",
                button: {
                    text: "Save it!"
                },
            })
                .then((name) => {
                    if (!name)
                        name = "saved_" + SELECTED_COMPILER;

                    saveSCExample(name);
                    if (changeToExample)
                        setExample(SELECTED_COMPILER, $("#ExampleList")[0].selectedIndex);
                });
            /*
            var contractsNameByLanguage = "saved_" + SELECTED_COMPILER;
            var arraySessionsCode = getAllSections();
            setLocalStorage(contractsNameByLanguage, JSON.stringify(arraySessionsCode));
            setExample(SELECTED_COMPILER, $("#ExampleList")[0].selectedIndex);
            //JSON.parse(getLocalStorage("temp_csharp"))
            addCodeToExample(contractsNameByLanguage, "saved" + SELECTED_COMPILER);*/
        } else
            if (changeToExample)
                setExample(SELECTED_COMPILER, $("#ExampleList")[0].selectedIndex);
    });
}


function askForDeletingContract() {
    var key = $("#ExampleList")[0].value;
    if (!USER_EXAMPLES.has(key)) {
        swal({
            icon: "info",
            title: "Can't be deleted",
            text: "Trying to delete an example or contract does not exist!",
            buttons: false,
            timer: 8000
        });
        return;
    }

    swal({
        title: "Want to delete contract " + key + "?",
        icon: "warning",
        buttons: ["No", "Yes"],
        timer: 15000,
    }).then((buttonOption) => {
        if (buttonOption) {
            if (USER_EXAMPLES.delete(key)) {
                removeExampleFromList(key);
                storeSmartContractExamplesToLocalStorage();

                // Set to first
                $("#ExampleList")[0].selectedIndex = 0;
                setExample(SELECTED_COMPILER, 0);
            } else {
                console.error("Trying to delete contract that was not found or is an example");
            }
        }
    });
}

function setExampleOnChange() {
    askForSavingContracts();
    //setExample(SELECTED_COMPILER, $("#ExampleList")[0].selectedIndex);
}


function setExample(language, selected_index) {
    // First clean all session
    cleanAllSessionsInsteadOfMain();
    aceEditor.getSession().setValue("");
    //userContracts_key
    var idToSet = $("#ExampleList")[0][$("#ExampleList")[0].selectedIndex].id;
    console.log("Selecting example: " + selected_index + " for Compiler: " + language + " id: " + idToSet);
    //

    if (idToSet.slice(0, 13) === "userContracts") {
        var key = idToSet.slice(13 + 1);
        restoreSCFromMapToAceEditor(key);
    } else {
        getFiles(language, selected_index, 0);
    }
    // cleaning file to Save name
    //$("#cbx_example_name")[0].value = "";
}

function getFiles(language, selected_index, index = 0) {
    var vExamples = cSharpFiles;

    if (language === "python")
        vExamples = cPythonFiles;

    var cutSize = "./assets/sc_examples/" + language + "/";
    var numfiles = vExamples[selected_index].length;

    if (index < numfiles) {
        var file = vExamples[selected_index][index];
        $.get(file, function (data) {
            aceEditor.getSession().setValue(aceEditor.getSession().getValue() + data);
            if (numfiles > 1 && index < (numfiles - 1)) {
                index++;
                var nextFile = vExamples[selected_index][index];
                var nextFileName = nextFile[0].slice(cutSize.length);
                //console.log("index: " + index + "/" + numfiles + " file: " + nextFileName)
                Editor.addNewTab(nextFileName);

                // Move to tab to simulate click and activate as current session
                var nameToClick = "#textChildAce" + (Editor.tabs - 1);
                $(nameToClick).click();

                getFiles(language, selected_index, index);
            }
        });
    }

    //if (numfiles == 1)
    //    goToMainTab();
}

function addOptionToSelectionBox(textToOption, valueToOption, walletSelectionBox, title = "") {
    var option = document.createElement("option");
    option.text = textToOption;
    option.value = valueToOption;
    option.title = title;
    var select = document.getElementById(walletSelectionBox);
    select.appendChild(option);
}

function updateCompilersSelectionBox(compilerType) {
    $.get(BASE_PATH_COMPILERS + '/getcompilers',
        function (data) {
            compilerSelectionBoxID = "compilers_versions-selection-box";
            compilerSelectionBoxObj = document.getElementById(compilerSelectionBoxID);
            compilerSelectionBoxObj.options.length = 0;

            indexToSelect = 0;
            for (c = 0; c < data.length; c++) {
                if (data[c].compiler == compilerType) {
                    var valueToOption = compilerType + ":" + data[c].version;
                    addOptionToSelectionBox(data[c].version, valueToOption, compilerSelectionBoxID, "Selected compiler version is " + valueToOption);
                    if (data[c].version === "latest")
                        indexToSelect = compilerSelectionBoxObj.length - 1;
                }
            }
            $("#compilebtn")[0].disabled = false;
            $("#compilers_server-selection-box")[0].disabled = false;
            $("#compilers_versions-selection-box")[0].disabled = false;
            //Select the latest as default
            compilerSelectionBoxObj.selectedIndex = indexToSelect;
        },
        "json" // The format the response should be in
    );
}

function convertBase64ToHexByte(base64ToConvert) {
    var hexcode = "";
    for (b = 0; b < base64ToConvert.length; b++) {
        var hexByte = base64ToConvert.charCodeAt(b).toString(16);
        if (hexByte.length == 1)
            hexByte = "0" + hexByte;
        hexcode += hexByte;
    }
    return hexcode;
}

// on linux you can --- echo "avmopdecode" | xxd -r -p > test.nef
function socketCompilerCompilexResult() {
    socketCompilers.on('compilexResult', function (socketData) {
        console.log(socketData.stdout)
        dataSocket = JSON.parse(socketData.stdout);
        console.log(dataSocket);
        $("#compilebtn")[0].disabled = false;
        $("#compilers_server-selection-box")[0].disabled = false;
        $("#compilers_versions-selection-box")[0].disabled = false;
        var coderr = atob(dataSocket.output);
        $("#codewarnerr").val(coderr);

        // Loading Manifest Info
        var manifestEmpty = dataSocket.manifest == "";
        var nefEmpty = dataSocket.nef == "";

        if (nefEmpty == true)
            $("#codewarnerr").val($("#codewarnerr").val() + "NEF is empty\n");

        if (manifestEmpty == true)
            $("#codewarnerr").val($("#codewarnerr").val() + "MANIFEST is empty\n");

        if (nefEmpty == false) {
            var nefByteArray = atob(dataSocket.nef);
            var hexcodeavm = convertBase64ToHexByte(nefByteArray);
            $("#codeavm").val(hexcodeavm);
            hexcodeavm = hexcodeavm.replace(/(\r\n|\n|\r)/gm, "");
            $("#opcodes").val("");
            //printOpcode(hexcodeavm, $("#opcodes"));
            //console.log("GRAVANDO BINARIO: "+typeof(datacontent)+":"+datacontent);
            localStorage.setItem('avmFile', hexcodeavm); //, {type: 'application/octet-stream'});
            //datacontent = localStorage.getItem('avmFile', {type: 'application/octet-stream'});
            //console.log("LENDO BINARIO: "+typeof(datacontent)+":"+datacontent);
            //console.log(localStorage.getItem('avmFile').charCodeAt(0));
            //$("#btn_download")[0].style = "";

            //filling hashes
            //getScriptHashFromAVM
            var contractScriptHash = Neon.u.hash160(hexcodeavm);
            var avmSize = Math.ceil(hexcodeavm.length / 2);
            updateCompiledOrLoadedContractInfo(contractScriptHash, avmSize);
        }

        var contractExists = false;
        if (dataSocket.manifest != "") {
            console.log("loading manifest");
            var textmanifest = atob(dataSocket.manifest);
            $("#codemanifest").val(textmanifest);

            // UPDATE LOCAL CONTRACTS AND CALL FUNCTIONS TO FILL THE BOX
            var jsonLocalContract = ({
                hash: contractScriptHash,
                manifest: JSON.parse(textmanifest),
                nef: dataSocket.nef
            });
            contractExists = checkIfNative(jsonLocalContract.hash) || checkIfLocalContractExists(jsonLocalContract.hash) != -1;
            if (!contractExists) {
                LOCAL_CONTRACTS.push(jsonLocalContract);
                CONTRACTS_TO_LIST = LOCAL_CONTRACTS;
                addContractsToSelectionBox("local_contracts", "local_contract");
            }
        }

        var textSwal = "Proceed to Contracts tab.";
        var timerSwal = 1700;
        if (contractExists) {
            textSwal = "However, contract is already registered on Local Contracts.";
            timerSwal = 3500;
        }

        if (dataSocket.manifest != "" && dataSocket.nef != "") {
            console.log(dataSocket.manifest);
            var manifestAtob = atob(dataSocket.manifest);
            var manifestJson = JSON.parse(manifestAtob);
            console.log(manifestJson);
            // Loading all ABI related boxes
            if (manifestJson.abi != "") {
                updateABITextarea(manifestJson.abi);
            }

            $('#collapseMore').collapse('show');
            swal({
                title: "Compiled with success!",
                icon: "success",
                text: textSwal,
                buttons: false,
                timer: timerSwal
            });
        } else {
            swal({
                icon: "info",
                title: "Compiled with coding error!",
                text: "Please check compiling log. Manifest is empty: " + manifestEmpty + ", NEF is empty: " + nefEmpty,
                buttons: false,
                timer: 8000
            });
        }
    });
}

function updateCompilersList() {
    boxID = "compilers_server-selection-box";
    document.getElementById(boxID).options.length = 0;

    //Get fixed list
    var compilersList = getAllAvailableService("ecocompilers", default_nodes);
    for (c = 0; c < compilersList.length; c++)
        addOptionToSelectionBox(compilersList[c], compilersList[c], boxID, "Selected server version is " + compilersList[c]);

    //Select the latest as default
    document.getElementById(boxID).selectedIndex = 0;
}

function changeServerBasePath(){
    BASE_PATH_COMPILERS = document.getElementById("compilers_server-selection-box").value;
    updateListOfAvailableCompilerVersion(language);
}


$(document).ready(function () {
    aceEditor = createEditor("aceEditor", "ace/mode/csharp");
    openedSessions.set(-1, new ace.EditSession("mainSession"));
    goToMainTab();
    updateCompilersList();
    setCompiler();
});