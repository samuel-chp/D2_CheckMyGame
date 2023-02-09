var report;

window.onload = (event) => {
    // Read query params
    let searchParams = new URLSearchParams(window.location.search);
    let instanceId = searchParams.get('instance_id');

    initPage(instanceId);

    // Set up callbacks towards players
    $(document).on('click', '.btn-player', function () {
        let playerInfo = $(this).closest('tr').data();

        let query = new URLSearchParams();
        $.each(playerInfo, function (info, value) {
            query.append(info, value);
        })

        window.location.href = '/player?' + query.toString();
    });
};

async function initPage(instanceId) {
    // Check if guardian exist in DB
    let result = await localDb.getCarnageReport(instanceId);
    if (result) {
        // Report found in DB
        report = result;
    } else {
        // Fetch report from bungie
        const request = await bungieAPI.fetchCarnageReport(instanceId);
        if (request === null) {
            console.error("Couldn't fetch carnage report from api.");
            return;
        }
        report = request["Response"];
        report["instanceId"] = instanceId;
        localDb.addCarnageReport(report);
    }

    const teamScore = {
        winner: {
            teamId: report["teams"][0]["standing"]["basic"]["value"] < 1 ?
                report["teams"][0]["teamId"] : report["teams"][1]["teamId"],
            score: report["teams"][0]["standing"]["basic"]["value"] < 1 ?
                report["teams"][0]["score"]["basic"]["value"] : report["teams"][1]["score"]["basic"]["value"],
        },
        loser: {
            teamId: report["teams"][0]["standing"]["basic"]["value"] < 1 ?
                report["teams"][1]["teamId"] : report["teams"][0]["teamId"],
            score: report["teams"][0]["standing"]["basic"]["value"] < 1 ?
                report["teams"][1]["score"]["basic"]["value"] : report["teams"][0]["score"]["basic"]["value"],
        }
    };
    setScore(teamScore);

    setDate(new Date(report["period"]));

    setDuration(report["entries"][0]["values"]["activityDurationSeconds"]["basic"]["value"]);

    // Add players
    $('#alpha-scoreboard tbody').empty();
    $('#beta-scoreboard tbody').empty();

    for (const entry of report["entries"]) {
        // TODO: add per weapons stats
        const player = {
            membershipId: entry["player"]["destinyUserInfo"]["membershipId"],
            membershipType: entry["player"]["destinyUserInfo"]["membershipType"],
            characterId: entry["characterId"],
            displayName: entry["player"]["destinyUserInfo"]["bungieGlobalDisplayName"],
            displayNameCode: entry["player"]["destinyUserInfo"]["bungieGlobalDisplayNameCode"],
            winner: entry["values"]["team"]["basic"]["value"] === teamScore["winner"]["teamId"],
            score: entry["values"]["score"]["basic"]["value"],
            kills: entry["values"]["kills"]["basic"]["value"],
            assists: entry["values"]["assists"]["basic"]["value"],
            deaths: entry["values"]["deaths"]["basic"]["value"],
        }

        // Alpha is always the winning team
        if (player["winner"]) {
            addPlayerRow("#alpha-scoreboard", player);
        } else {
            addPlayerRow("#beta-scoreboard", player);
        }
    }

    populateReportWithCombatRating();
}

async function populateReportWithCombatRating() {
    // TODO: save in DB and make this file prettier...
    // TODO: handle private users
    
    let queries = [];
    let queriesId = [];
    
    // Get time steps for queries
    let periods = [];
    const today = new Date();
    let current = new Date(BungieAPI.seasonStartDate);
    while (dateDiffInDays(current, today) > 0) {
        let next = new Date(current);
        next.setDate(next.getDate() + 30);
        next = new Date(Math.min(next.getTime(), today.getTime()));
        periods.push([current, next]);
        current = new Date(next);
    }

    // Populate queries
    for (const entry of report["entries"]) {
        const membershipId = entry["player"]["destinyUserInfo"]["membershipId"];
        const membershipType = entry["player"]["destinyUserInfo"]["membershipType"];
        const characterId = entry["characterId"];
        for (const period of periods) {
            queries.push(bungieAPI.fetchPlayerStats(membershipId, membershipType, characterId,
                formatDateToAPIFormat(period[0]), formatDateToAPIFormat(period[1]), 
                "General", report["activityDetails"]["mode"], "Daily"));
            queriesId.push(Guardian.getPlayerId(membershipId, membershipType));
        }
    }
    
    let results = await Promise.all(queries);
    
    // Calculate seasonal combat rating (mean of every day)
    const step = periods.length;
    let combatRating = new Map();
    for (let i = 0; i < results.length; i += step) {
        let dailyStats = [];
        for (let j = 0; j < step; j++) {
            const modeStr = Object.getOwnPropertyNames(results[i+j]["Response"])[0];
            dailyStats = dailyStats.concat(results[i+j]["Response"][modeStr]["daily"]);
        }
        let cr = [];
        for (let d of dailyStats) {
            if (d) {
                cr.push(d["values"]["combatRating"]["basic"]["value"]);
            }
        }
        combatRating.set(queriesId[i], mean(cr));
    }
    
    // Populate table
    combatRating.forEach((cr, playerId, _) => {
        const membershipId = playerId.split('-')[0];
        const membershipType = playerId.split('-')[1];
        $(`[data-membership_id=${membershipId}][data-membership_type=${membershipType}]`).append(`<td>${cr.toFixed(0)}</td>`);
    });
    
    // Print team mean combat rating
    let alphaCR = [];
    let betaCR = [];
    combatRating.forEach((cr, playerId, _) => {
        const membershipId = playerId.split('-')[0];
        const membershipType = playerId.split('-')[1];
        let cell = $(`[data-membership_id=${membershipId}][data-membership_type=${membershipType}]`);
        if ($(cell).parent().parent().attr('id') === "alpha-scoreboard") {
            alphaCR.push(cr);
        } else {
            betaCR.push(cr);
        }
    });
    $('#alpha-cr').text(`${mean(alphaCR).toFixed(0)}`);
    $('#beta-cr').text(`${mean(betaCR).toFixed(0)}`);
}

function setDate(date) {
    let isoDate = date.toISOString();
    const ymd = isoDate.split('T')[0];
    const hm = isoDate.split('T')[1].split(':')[0] + ':' + isoDate.split('T')[1].split(':')[1];

    $('#carnage-date').text(`${ymd}   ${hm}`);
}

function setDuration(durationS) {
    const m = Math.floor(durationS / 60);
    const s = durationS % 60;

    $('#carnage-duration').text(`${m}min ${s}s`);
}

function setScore(teamScore) {
    $('#winner-score').text(teamScore["winner"]["score"]);
    $('#loser-score').text(teamScore["loser"]["score"]);
}

function addPlayerRow(tableId, playerData) {
    const kd = playerData.deaths > 0 ? playerData.kills / playerData.deaths : playerData.kills;
    const kad = playerData.deaths > 0 ?
        (playerData.kills + playerData.assists) / playerData.deaths :
        (playerData.kills + playerData.assists);

    let template = `
            <tr data-membership_id="${playerData.membershipId}" 
                data-membership_type="${playerData.membershipType}" 
                data-character_id="${playerData.characterId}"
                data-display_name="${playerData.displayName}"
                data-display_name_code="${playerData.displayNameCode}">
                <td>
                    <button class="btn btn-primary btn-player">
                        ${playerData.displayName}
                    </button>
                </td>
                <td>${playerData.score}</td>
                <td>${playerData.kills}</td>
                <td>${playerData.assists}</td>
                <td>${playerData.deaths}</td>
                <td>${+kd.toFixed(2)}</td>
                <td>${+kad.toFixed(2)}</td>
            </tr>
            `;
    $(`${tableId} tbody`).append(template);
}