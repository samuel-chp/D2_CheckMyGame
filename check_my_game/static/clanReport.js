var founderDisplayName;
var founderDisplayNameCode;

window.onload = (event) => {
    // Parse query params
    let searchParams = new URLSearchParams(window.location.search);
    let groupId = searchParams.get('group_id');

    initPage(groupId);

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

async function initPage(groupId) {
    // Fetch clan from api
    bungieAPI.fetchClanMembers(groupId).then((r) => {
        // Populate members
        for (const m of r["Response"]["results"]) {
            const member = new Guardian(
                m["destinyUserInfo"]["membershipId"],
                m["destinyUserInfo"]["membershipType"],
                m["destinyUserInfo"]["bungieGlobalDisplayName"],
                m["destinyUserInfo"]["bungieGlobalDisplayNameCode"],
            );
            
            // Check cross save
            if (m["destinyUserInfo"]["crossSaveOverride"] !== 0) {
                if (m["destinyUserInfo"]["membershipType"] === m["destinyUserInfo"]["crossSaveOverride"]) {
                    addGuardianToTable(member);
                }
            } else {
                addGuardianToTable(member);
            }
        }
        // Print clan size
        // Do not use r["Response"]["detail"]["memberCount"] as it counts per platform 
        // (for example 2 entries for the same player on 2 different platforms)
        $("#clan-size").text($('#members-table tbody').children().length);
    });

    // Fetch clan info
    bungieAPI.fetchClan(groupId).then((r) => {
        $("#clan-name span:nth-child(1)").text(r["Response"]["detail"]["name"]);
        $("#clan-name span:nth-child(2)").text(r["Response"]["detail"]["clanInfo"]["clanCallsign"]);
        $("#clan-desc").text(r["Response"]["detail"]["motto"]);
        
        const creationDate = (new Date(r["Response"]["detail"]["creationDate"])).toISOString();
        const ymd = creationDate.split('T')[0];
        const hm = creationDate.split('T')[1].split(':')[0] + ':' + creationDate.split('T')[1].split(':')[1];
        $('#clan-creation-date').text(`${ymd}   ${hm}`);
        
        // Set founder color
        founderDisplayName = r["Response"]["founder"]["destinyUserInfo"]["bungieGlobalDisplayName"];
        founderDisplayNameCode = r["Response"]["founder"]["destinyUserInfo"]["bungieGlobalDisplayNameCode"];
        $(`[data-display_name=${founderDisplayName}][data-display_name_code=${founderDisplayNameCode}] td button`)
            .removeClass("btn-primary")
            .addClass("btn-danger");
    });
}

function addGuardianToTable(guardian) {
    let template = `
        <tr data-membership_id="${guardian.membershipId}" data-membership_type="${guardian.membershipType}"
            data-display_name="${guardian.displayName}" data-display_name_code="${guardian.displayNameCode}">
            <td>
                <button class="btn 
${guardian.displayName === founderDisplayName && guardian.displayNameCode === founderDisplayNameCode ? "btn-danger" : "btn-primary"} 
                                    btn-player">
                    ${guardian.displayName}#${guardian.displayNameCode}
                </button>
            </td>
            <td>0</td>
            <td>0</td>
        </tr>
    `;
    $('#members-table tbody').append(template);
}
