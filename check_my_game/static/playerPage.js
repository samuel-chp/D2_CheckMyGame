var playerHistory;

window.onload = (event) => {
    // Parse query params
    let searchParams = new URLSearchParams(window.location.search);
    let membershipId = searchParams.get('membership_id');
    let membershipType = searchParams.get('membership_type');
    let displayName = searchParams.get('display_name');
    let displayNameCode = searchParams.get('display_name_code');

    initPage(membershipId, membershipType, displayName, displayNameCode);

    // Callbacks on carnage report click
    $(document).on('click', '.btn-carnage', function () {
        let carnageInfo = $(this).closest('tr').data();

        let query = new URLSearchParams();
        $.each(carnageInfo, function (info, value) {
            query.append(info, value);
        })

        window.location.href = '/carnageReport?' + query.toString();
    })
};

async function initPage(membershipId, membershipType, displayName, displayNameCode) {
    setName(displayName, displayNameCode);

    // Fetch profile for characterIds
    await fetchCharacters(membershipId, membershipType);

    // Get characters id
    const characterIds = [...document.getElementById("character-select").options].map(o => o.value);

    // Fetch all player stats
    playerHistory = new PlayerHistory(membershipId, membershipType, characterIds);
    playerHistory.populateFromActivities()
        .then(() => refreshTables());
}

function fillCharactersSelect(charactersData) {
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
        option.text(`${bungieAPI.getClassTypeStr(charactersData[characterId]["classType"])}   ${charactersData[characterId]["light"]}`);
        option.attr("value", characterId);
        ++i;
    }

    // Select the most recent played character
    $("#character-select").val(lastPlayed["characterId"]);
}

async function fetchCharacters(membershipId, membershipType) {
    const result = await bungieAPI.fetchPlayerProfile(membershipId, membershipType);
    if (result && result["ErrorCode"] === 1) {

        fillCharactersSelect(result["Response"]["characters"]["data"]);
    }
}

function refreshTables() {
    fillStatsTable();
    fillCarnageReportTable();
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

function fillStatsTable() {
    // Get selected character
    const characterId = $('#character-select option:selected').val();

    // Get selected gamemode
    const gamemode = $('#gamemode-select option:selected').val();

    // Get stats
    let stats = {};
    const period = $('#period-select option:selected').val();
    if (period === "allTime") {
        stats = playerHistory.getStatsAllTime(characterId, gamemode);
    } else if (period === "seasonal") {
        stats = playerHistory.getStatsSeasonal(characterId, gamemode);
    } else if (period === "weekly") {
        stats = playerHistory.getStatsWeekly(characterId, gamemode);
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

function addCarnageReportToTable(report) {
    let isoDate = report.date.toISOString();
    const ymd = isoDate.split('T')[0];
    const hm = isoDate.split('T')[1].split(':')[0] + ':' + isoDate.split('T')[1].split(':')[1];

    let template = `
            <tr data-instance_id="${report.instanceId}">
                <td>
                    <button class="btn btn-primary btn-carnage">
                        <p>${report.gamemode}</p>
                        <p>${ymd} <br> ${hm}</p>
                        <p>${report.map}</p>
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

function fillCarnageReportTable() {
    // Get selected character
    const characterId = $('#character-select option:selected').val();

    // Get selected gamemode
    const gamemode = parseInt($('#gamemode-carnage-select option:selected').val());

    // Get number of activities to load
    const n = 10;

    // Fetch data
    let reports = [];
    for (const activity of playerHistory.activities[characterId]) {
        if (activity["modes"].includes(gamemode)) {
            const mapInfo = bungieAPI.getPvPMapInfo("1");

            // To add win and lose score, we must fetch the carnage report entirely...

            let report = {
                instanceId: activity["instanceId"],
                gamemode: bungieAPI.getGamemodeStr(activity["mode"]),
                date: activity["period"],
                map: mapInfo["name"],
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
}

function setName(displayName, displayNameCode) {
    const fname = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    $('#guardian-name').text(fname + '#' + displayNameCode);
}