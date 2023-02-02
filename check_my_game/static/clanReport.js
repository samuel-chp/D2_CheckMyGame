var members = [];

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
        console.log(r);
        // Populate members
        for (const m of r["Response"]["results"]) {
            const member = new Guardian(
                m["destinyUserInfo"]["membershipId"],
                m["destinyUserInfo"]["membershipType"],
                m["destinyUserInfo"]["bungieGlobalDisplayName"],
                m["destinyUserInfo"]["bungieGlobalDisplayNameCode"],
            )
            members.push(member);
            addGuardianToTable(member);
        }
    });

    // Fetch clan info
    bungieAPI.fetchClan(groupId).then((r) => {
        $("#clan-name span:nth-child(1)").text(r["Response"]["detail"]["name"]);
        $("#clan-name span:nth-child(2)").text(r["Response"]["detail"]["clanInfo"]["clanCallsign"]);
        $("#clan-desc").text(r["Response"]["detail"]["about"]);
        $("#clan-size").text(r["Response"]["detail"]["memberCount"]);

        const creationDate = (new Date(r["Response"]["detail"]["creationDate"])).toISOString();
        const ymd = creationDate.split('T')[0];
        const hm = creationDate.split('T')[1].split(':')[0] + ':' + creationDate.split('T')[1].split(':')[1];
        $('#clan-creation-date').text(`${ymd}   ${hm}`);
    });
}

function addGuardianToTable(guardian) {
    let template = `
        <tr data-membership_id="${guardian.membershipId}" data-membership_type="${guardian.membershipType}"
            data-display_name="${guardian.displayName}" data-display_name_code="${guardian.displayNameCode}">
            <td>
                <button class="btn btn-primary btn-player">
                    ${guardian.displayName}#${guardian.displayNameCode}
                </button>
            </td>
            <td>0</td>
            <td>0</td>
        </tr>
    `;
    $('#members-table tbody').append(template);
}
