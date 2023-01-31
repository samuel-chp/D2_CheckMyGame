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
    })
};

async function initPage(instanceId) {
    const report = (await bungieAPI.fetchCarnageReport(instanceId))["Response"];

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

        if (player["winner"]) {
            addPlayerRow("#alpha-scoreboard", player);
        } else {
            addPlayerRow("#beta-scoreboard", player);
        }
    }

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