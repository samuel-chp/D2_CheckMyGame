var guardian = {};

window.onload = (event) => {
    // Parse query params
    let searchParams = new URLSearchParams(window.location.search);
    let membershipId = searchParams.get('membership_id');
    let membershipType = searchParams.get('membership_type');
    // let originCharacterId = searchParams.get('characterId'); // From carnage report
    let displayName = searchParams.get('display_name');
    let displayNameCode = searchParams.get('display_name_code');

    initPage(membershipId, membershipType, displayName, displayNameCode);

    // Callback to see clan page
    $(document).on('click', '#btn-clan', function () {
        let clanInfo = $(this).data();

        let query = new URLSearchParams();
        $.each(clanInfo, function (info, value) {
            query.append(info, value);
        })

        window.location.href = '/clan?' + query.toString();
    })

    // Callbacks on carnage report click
    $(document).on('click', '.btn-carnage', function () {
        let carnageInfo = $(this).closest('tr').data();

        let query = new URLSearchParams();
        $.each(carnageInfo, function (info, value) {
            query.append(info, value);
        })

        window.location.href = '/carnageReport?' + query.toString();
    })

    // Add delay between clicks on refresh buttons
    $(document).on('click', '.btn-refresh', function () {
        $(".btn-refresh").each(function (_, btn) {
            $(btn).attr("disabled", true);
            setTimeout(() => { $(btn).attr("disabled", false); }, 2000);
        });
    })
};

async function initPage(membershipId, membershipType, displayName, displayNameCode) {
    fillName(displayName, displayNameCode);

    // Check if guardian exist in DB
    let playerId = Guardian.getPlayerId(membershipId, membershipType);
    let result = await localDb.getGuardian(playerId);
    if (result) { // no need to check for lastUpdate as we update anyway later
        // Guardian found in DB
        guardian = Guardian.fromJSONObject(result);
        fillCharacters(guardian.characters);
        fillClan(guardian.clan.clanId, guardian.clan.clanName, guardian.clan.clanSign);
        refreshActivities();
    } else {
        guardian = new Guardian(membershipId, membershipType, displayName, displayNameCode);
    }

    // For safety reload everything (only on page load)
    await guardian.fetchCharacters();
    fillCharacters(guardian.characters);
    guardian.fetchClan().then(() => fillClan(guardian.clan.clanId, guardian.clan.clanName, guardian.clan.clanSign));
    fetchActivities();
}

function fetchActivities() {
    // Get characters id, last played first
    let currentCharacterId = guardian.getLastPlayedCharacter().characterId;
    let characterIds = [currentCharacterId];
    for (let characterId in guardian.characters){
        if (characterId !== currentCharacterId) {
            characterIds.push(characterId);
        }
    }

    // First select the parameters that require less data (weekly)
    $('#period-select').val("weekly");

    // Populate all
    for (let characterId of characterIds) {
        // all time
        guardian.populateCharacterActivities(characterId, 0, 100, 250)
            .then(() => fillTables());
    }
}

async function refreshActivities() {
    fillTables(); // Ensure data is resfreshed (changing character for instance) before actualizing
    let currentCharacterId = $('#character-select').val();
    await guardian.populateCharacterActivities(currentCharacterId, 0, 1, 100);
    fillTables();
}

function fillTables() {
    fillStatsTable();
    fillCarnageReportTable();
}

// STATS
function fillStatsTable() {
    // Get selected character
    const characterId = $('#character-select option:selected').val();

    // Get selected gamemode
    const gamemode = $('#gamemode-select option:selected').val();

    // Get stats
    let stats = {};
    const period = $('#period-select option:selected').val();
    if (period === "allTime") {
        stats = guardian.getStatsAllTime(characterId, gamemode);
    } else if (period === "seasonal") {
        stats = guardian.getStatsSeasonal(characterId, gamemode);
    } else if (period === "weekly") {
        stats = guardian.getStatsWeekly(characterId, gamemode);
    }

    // Empty table rows
    $('#stats-table tbody').empty();

    // Fill table
    const kd = stats["deaths"] > 0 ? stats["kills"] / stats["deaths"] : stats["kills"];
    const kad = stats["deaths"] > 0 ? (stats["kills"] + stats["assists"]) / stats["deaths"] : (stats["kills"] + stats["assists"]);
    const hoursPlayed = Math.round(stats["secondsPlayed"] / 3600);
    addStatToTable("K/D", kd);
    addStatToTable("KA/D", kad);
    addStatToTable("Hours played", hoursPlayed, hoursPlayed / stats["activitiesEntered"]);
    addStatToTable("Activities entered", stats["activitiesEntered"]);
    addStatToTable("Activities won", stats["activitiesWon"]);
    addStatToTable("Score", stats["score"], stats["score"] / stats["activitiesEntered"]);
    addStatToTable("Kills", stats["kills"], stats["kills"] / stats["activitiesEntered"]);
    addStatToTable("Assits", stats["assists"], stats["assists"] / stats["activitiesEntered"]);
    addStatToTable("Deaths", stats["deaths"], stats["deaths"] / stats["activitiesEntered"]);
}

function addStatToTable(statName, valueTotal, valuePGA = 0) {
    valueTotal = isNaN(valueTotal) ? 0 : valueTotal;
    let template = `
            <tr>
                <td>${statName}</td>
                <td>${+valueTotal.toFixed(2)}</td>
                <td>${(valuePGA > 0) ? +valuePGA.toFixed(2) : "-"}</td>
            </tr>
            `;
    $('#stats-table tbody').append(template);
}

// CARNAGE
function fillCarnageReportTable() {
    // Get selected character
    const characterId = $('#character-select option:selected').val();

    // Get selected gamemode
    const gamemode = parseInt($('#gamemode-carnage-select option:selected').val());

    // Get number of activities to load
    const n = 10;

    // Fetch activity data
    let reports = [];
    for (const activity of guardian.activities[characterId]) {
        if (activity["modes"].includes(gamemode)) {
            // To add win and lose score, we must fetch the carnage report entirely...
            let report = {
                instanceId: activity["instanceId"],
                gamemode: BungieAPI.getGamemodeStr(activity["mode"]),
                date: activity["period"],
                map: activity["referenceId"],
                personalKD: activity["values"]["kills"] / activity["values"]["deaths"],
                personalKAD: (activity["values"]["kills"] + activity["values"]["assists"]) / activity["values"]["deaths"],
            };
            reports.push(report);
        }

        if (reports.length >= n) {
            break;
        }
    }

    // Empty table rows
    $('#carnage-reports-table tbody').empty();

    // Add to table
    for (const report of reports) {
        addCarnageReportToTable(report);
    }

    // Update map info
    updateMapInfo();
}

function addCarnageReportToTable(report) {
    let isoDate = (new Date(report.date)).toISOString();
    const ymd = isoDate.split('T')[0];
    const hm = isoDate.split('T')[1].split(':')[0] + ':' + isoDate.split('T')[1].split(':')[1];

    let template = `
            <tr data-instance_id="${report.instanceId}">
                <td>
                    <button class="btn btn-primary btn-carnage">
                        <p>${report.gamemode}</p>
                        <p>${ymd} <br> ${hm}</p>
                        <p data-reference_id="${report.map}">-</p>
                    </button>
                </td>
                <td>
                    <p>KD</p>
                    <p>${(report.personalKD > 0 && isFinite(report.personalKD)) ? +report.personalKD.toFixed(2) : 0}</p>
                </td>
                <td>
                    <p>KDA</p>
                    <p>${(report.personalKAD > 0 && isFinite(report.personalKAD)) ? +report.personalKAD.toFixed(2) : 0}</p>
                </td>
            </tr>
            `;
    $('#carnage-reports-table tbody').append(template);
}

// MAPS
async function updateMapInfo() {
    // Get referenceIds needed
    let referenceIds = [];
    for (const element of $(".btn-carnage [data-reference_id]")) {
        referenceIds.push($(element).data()["reference_id"]);
    }
    
    // Fetch from DB or prepare tasks for bungie
    let maps = {};
    let fetchMapTasks = [];
    for (const refId of referenceIds) {
        let result = await localDb.getMapPvP(refId);
        if (result) {
            maps[refId] = result;
        } else {
            fetchMapTasks.push(bungieAPI.fetchMapDefinition(refId));
        }
    }
    
    // Call bungie
    let results = await Promise.all(fetchMapTasks);
    for (let r of results) {
        r = r["Response"];
        let map = {
            referenceId: r["hash"],
            name: r["displayProperties"]["name"],
            description: r["displayProperties"]["description"],
            image: r["pgcrImage"]
        };
        maps[map.referenceId] = map;
        localDb.addMapPvP(map);
    }
    
    // Update table
    for (const element of $(".btn-carnage [data-reference_id]")) {
        const referenceId = $(element).data()["reference_id"];
        $(element).text(maps[referenceId]["name"]);
    }
}

// OTHERS
function fillName(displayName, displayNameCode) {
    const fname = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    $('#guardian-name').text(fname + '#' + displayNameCode);
}

function fillCharacters(charactersData) {
    let i = 1;
    let lastPlayed = {characterId: null, date: new Date("2010")};
    for (let characterId in charactersData) {
        // save last played character
        let dateLastPlayed = new Date(charactersData[characterId]["dateLastPlayed"]);
        if (dateLastPlayed > lastPlayed["date"]) {
            lastPlayed["date"] = dateLastPlayed;
            lastPlayed["characterId"] = characterId;
        }

        // Fill options
        let option = $(`#character-select option:nth-of-type(${i})`);
        option.text(`${BungieAPI.getClassTypeStr(charactersData[characterId]["classType"])}   ${charactersData[characterId]["light"]}`);
        option.attr("value", characterId);
        ++i;
    }

    // Select the most recent played character or the chosen one in query params
    let searchParams = new URLSearchParams(window.location.search);
    let originCharacterId = searchParams.get('characterId'); // From carnage report
    if (originCharacterId){
        $("#character-select").val(originCharacterId);
    } else{
        $("#character-select").val(lastPlayed["characterId"]);
    }

}

function fillClan(clanId, clanName, clanSign) {
    const btnClan = $("#btn-clan");
    btnClan.text(clanSign);
    btnClan.attr("data-group_id", clanId);
}
