document.addEventListener("DOMContentLoaded", function (event) {
    // on close alert
    $(document).on('click', '.alert-close', function () {
        $(this).parent().hide();
    })

    // On search player
    $('#player-search-input').keydown(function (event) {
        if (event.which === 13) {
            searchPlayer($(this).val());
        }
    });
    $('#player-search-input').keyup(function (event) {
        let prefix = $(this).val();
        if (prefix.length > 3) {
            searchPlayerByPrefix(prefix);
        }
    });
    
    // Search player btn
    $(document).on('click', '#player-search-btn', function () {
        searchPlayer($('#player-search-input').val());
    })

    // Callback on select platform btn
    $(document).on('click', '.btn-platform', function () {
        window.location.href = $(this).data()["target_url"];
    })

    // Callback close platform modal
    $(document).on('click', '.btn-close-modal', function () {
        $('#platformModal').modal('hide');
    })
});

function showAlert(message) {
    const alert = $('#search-alert');
    alert.text(message);

    alert.clearQueue();
    alert.show();
    alert.delay(5000).fadeOut(800);
}

function showModal(profiles, displayName, displayNameCode) {
    let query = new URLSearchParams();
    query.set("display_name", displayName);
    query.set("display_name_code", displayNameCode);

    $('.modal-body').empty();
    for (const profile of profiles) {
        query.set("membership_id", profile["membershipId"]);
        query.set("membership_type", profile["membershipType"]);
        let template = `
                    <button type="button" class="btn btn-dark btn-platform" data-target_url=${'/player?' + query.toString()}>
                        ${BungieAPI.getMembershipTypeStr([profile["membershipType"]])}
                    </button>
                `;
        $('.modal-body').append(template);
    }
    $("#platformModal").modal('show');
}

async function searchPlayer(playerName) {
    const [displayName, displayNameCode] = playerName.split('#');
    let result = await bungieAPI.searchPlayer(displayName, displayNameCode);
    if (result) {
        if (result["ErrorCode"] !== 1 || result["Response"].length == 0) {
            showAlert(`Player ${playerName} not found.`);
            return;
        }

        // Cross save enabled
        if (result["Response"].length > 1 && result["Response"][0]["crossSaveOverride"] !== 0) {
            const targetMembershipType = result["Response"][0]["crossSaveOverride"];
            let membershipId;
            for (let info of result["Response"]) {
                if (info["membershipType"] === targetMembershipType) {
                    membershipId = info["membershipId"];
                    break;
                }
            }
            let query = new URLSearchParams();
            query.set("membership_id", membershipId);
            query.set("membership_type", targetMembershipType);
            query.set("display_name", displayName);
            query.set("display_name_code", displayNameCode);
            window.location.href = '/player?' + query.toString();
            return;
        }
        
        // No cross save but only one result
        if (result["Response"].length === 1) {
            let query = new URLSearchParams();
            query.set("membership_id", result["Response"][0]["membershipId"]);
            query.set("membership_type", result["Response"][0]["membershipType"]);
            query.set("display_name", displayName);
            query.set("display_name_code", displayNameCode);
            window.location.href = '/player?' + query.toString();
            return;
        }

        // Multiple platforms
        showModal(result["Response"], displayName, displayNameCode);
    }
}

async function searchPlayerByPrefix(prefix) {
    const result = await bungieAPI.searchPlayerByPrefix(prefix);
    
    // Cancel if user typed before the result of this query
    if ($('#player-search-input').val().length != prefix.length) {
        return;
    }
    
    if (!result["Response"]) {
        return;
    }

    let players = [];
    for (const r of result["Response"]["searchResults"]) {
        players.push(r["bungieGlobalDisplayName"] + "#" + r["bungieGlobalDisplayNameCode"]);
    }
    
    // Update suggestions
    $("#player-suggestions").empty();
    for (const player of players) {
        $('#player-suggestions').append(`<option>${player}</option>`);
    }
}
