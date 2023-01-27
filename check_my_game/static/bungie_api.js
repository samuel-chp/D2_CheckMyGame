class BungieAPI {
    constructor(secret_key) {
        this.secret_key = secret_key;
        this.endpoint = "https://www.bungie.net";
    }

    async searchPlayer(displayName, displayNameCode) {
        try {
            return await $.ajax({
                    url: new URL('Platform/Destiny2/SearchDestinyPlayerByBungieName/all/', this.endpoint).href,
                    type: "POST",
                    headers: {'X-API-Key': this.secret_key},
                    data: JSON.stringify({
                        "displayName": displayName,
                        "displayNameCode": displayNameCode,
                    }),
                    datatype: 'json',
                }
            );
        } catch (error) {
            console.error(error);
        }
    }

    async fetchPlayerProfile(membershipId, membershipType) {
        let targetURL = new URL(`Platform/Destiny2/${membershipType}/Profile/${membershipId}/`, this.endpoint);
        targetURL.searchParams.append("components", "Characters");

        try {
            return await $.ajax({
                    url: targetURL.href,
                    type: "GET",
                    headers: {'X-API-Key': this.secret_key},
                    datatype: 'json',
                }
            )
        } catch (error) {
            console.error(error);
        }
    }

    async fetchPlayerStats(membershipId,
                           membershipType,
                           characterId = 0,
                           daystart = "",
                           dayend = "",
                           groups = "",
                           modes = "",
                           periodType = "") {
        let targetURL = new URL(`Platform/Destiny2/${membershipType}/Account/${membershipId}/Character/${characterId}/Stats/`, this.endpoint);
        {
            if (daystart !== "") {
                targetURL.searchParams.append("daystart", daystart);
            }
            if (dayend !== "") {
                targetURL.searchParams.append("dayend", dayend);
            }
            if (groups !== "") {
                targetURL.searchParams.append("groups", groups);
            }
            if (modes !== "") {
                targetURL.searchParams.append("modes", modes);
            }
            if (periodType !== "") {
                targetURL.searchParams.append("periodType", periodType);
            }
        }

        try {
            return await $.ajax({
                url: targetURL.href,
                type: "GET",
                headers: {'X-API-Key': this.secret_key},
                datatype: 'json',
                success: function (result) {
                    // console.log(result);
                },
                error: function (error) {
                    // console.log(error);
                }
            });
        } catch (error) {
            console.error(error);
        }
    }

    getClassTypeStr(classType) {
        if (classType === 0) {
            return "Titan";
        } else if (classType === 1) {
            return "Hunter";
        } else if (classType === 2) {
            return "Arcanist";
        }
        return "";
    }
}

class PlayerStats {
    constructor(membershipId, membershipType, characterIds, gamemodes=[]) {
        this.membershipId = membershipId;
        this.membershipType = membershipType;
        this.characterIds = characterIds;
        this.gamemodes = gamemodes;

        // Init storage
        this.allTime = {}
        this.daily = {}
        characterIds.forEach(characterId => {
            this.allTime[characterId] = {};
            this.daily[characterId] = {};
        })

        // Populate data
        characterIds.forEach(characterId => {
            this._populateStats(characterId);
        });
    }

    async _populateStats(characterId) {
        let playerStats = this;

        // All-time
        let rAllTime = bungieAPI.fetchPlayerStats(this.membershipId, this.membershipType, characterId,
            "", "", "", this.gamemodes.join(','), "");
        rAllTime.then((result) => {
            if (result["ErrorCode"] === 1) {
                for (const gamemode in result["Response"]) {
                    // Ensure creation of dict
                    if (!(gamemode in playerStats.allTime[characterId])) {
                        playerStats.allTime[characterId][gamemode] = {};
                    }
                    // populate dict
                    for (let statName in result["Response"][gamemode]["allTime"]) {
                        playerStats.allTime[characterId][gamemode][statName] = result["Response"][gamemode]["allTime"][statName]["basic"]["value"];
                        // pga tbd by dividing with activities entered
                    }
                }
            }
        });

        // Seasonal
        let seasonStartDate = new Date("2022-12-06");
        let today = new Date();

        // Create date range to fetch data from api with period of 30 days max
        let dateRange = [];
        let current = new Date(seasonStartDate);
        while (dateDiffInDays(current, today) > 30) {
            let next = new Date(current);
            next.setDate(next.getDate() + 30);
            dateRange.push({'daystart': new Date(current), 'dayend': new Date(next)});
            current.setDate(current.getDate() + 31);
        }
        dateRange.push({'daystart': new Date(current), 'dayend': new Date(today)});

        // fetch each date range stats
        for (const dr of dateRange){
            const seasonalStats = await bungieAPI.fetchPlayerStats(this.membershipId, this.membershipType, characterId,
                formatDateToAPIFormat(dr["daystart"]), formatDateToAPIFormat(dr["dayend"]),
                "", this.gamemodes.join(','),'Daily');
            
            if (seasonalStats) {
                if (seasonalStats["ErrorCode"] === 1) {
                    for (const gamemode in seasonalStats["Response"]){
                        // Ensure dict creation
                        if (!(gamemode in playerStats.daily[characterId])){
                            playerStats.daily[characterId][gamemode] = [];
                        }
                        // Populate dict
                        if ("daily" in seasonalStats["Response"][gamemode]){
                            // Format values same as allTime stats
                            for (let dayStat of seasonalStats["Response"][gamemode]["daily"]){
                                let formattedValues = {};
                                for (const statName in dayStat["values"]){
                                    formattedValues[statName] = dayStat["values"][statName]["basic"]["value"];
                                }
                                dayStat["values"] = formattedValues;
                                dayStat["period"] = new Date(dayStat["period"]);
                            }
                            playerStats.daily[characterId][gamemode].push(...seasonalStats["Response"][gamemode]["daily"]);
                        }
                    }
                } else {
                    console.log(`API error ${seasonalStats}.`);
                }
            }
        }
    }

    getAllTime(characterId, gamemode) {
        // Return dict:
        // {
        //     statName: {
        //         'total': 10,
        //         'pga': 5
        //     }
        // }
        return this.allTime[characterId][gamemode];
    }

    getSeasonal(characterId, gamemode) {
        // Sum all values
        let dailyStats = this.daily[characterId][gamemode];
        let result = {};
        
        // Aggregate
        for (const dayStats of dailyStats){
            for (const statName in dayStats["values"]){
                if (!(statName in result)){
                    result[statName] = 0;
                }
                result[statName] += dayStats["values"][statName];
            }
        }
        
        return result;
    }

    getWeekly(characterId, gamemode) {
        // Sum values from last week
        let dailyStats = this.daily[characterId][gamemode];
        let result = {};
        let today = new Date();
        
        // Aggregate
        for (const dayStats of dailyStats){
            if (dateDiffInDays(dayStats["period"], today) > 7){
                continue;
            }
            
            for (const statName in dayStats["values"]){
                if (!(statName in result)){
                    result[statName] = 0;
                }
                result[statName] += dayStats["values"][statName];
            }
        }
        
        return result;
    }
}

function dateDiffInDays(a, b) {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

function formatDateToAPIFormat(date) {
    return date.toISOString().split('T')[0];
}


bungieAPI = new BungieAPI('d1afcba184f644bdb4a4bb4a09e51e50');