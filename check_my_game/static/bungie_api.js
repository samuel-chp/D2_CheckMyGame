class BungieAPI {
    constructor(secret_key) {
        this.secret_key = secret_key;
        this.endpoint = "https://www.bungie.net/Platform";
    }

    searchPlayer(displayName, displayNameCode) {
        return $.ajax({
                url: new URL('Platform/Destiny2/SearchDestinyPlayerByBungieName/all/', "https://www.bungie.net").href,
                type: "POST",
                headers: {'X-API-Key': this.secret_key},
                data: JSON.stringify({
                    "displayName": displayName,
                    "displayNameCode": displayNameCode,
                }),
                datatype: 'json',
                success: function (result) {
                    console.log(result);
                },
                error: function (error) {
                    console.log(error);
                }
            }
        );
    }
}

bungieAPI = new BungieAPI('d1afcba184f644bdb4a4bb4a09e51e50');