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

    async fetchActivityHistory(membershipId,
                               membershipType,
                               characterId,
                               mode = 5,
                               page = 0,
                               count = 250) {
        // Clamp to max accepted by the API
        count = Math.min(count, 250);

        let targetURL = new URL(`Platform/Destiny2/${membershipType}/Account/${membershipId}/Character/${characterId}/Stats/Activities`, this.endpoint);
        targetURL.searchParams.append("mode", mode);
        targetURL.searchParams.append("page", page);
        targetURL.searchParams.append("count", count);

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
    
    async fetchEntityDefinition(entityType, hashIdentifier){
        let targetURL = new URL(`Platform/Destiny2/Manifest/${entityType}/${hashIdentifier}`, this.endpoint);

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
    
    async fetchMapDefinition(referenceId){
        return await this.fetchEntityDefinition("DestinyActivityDefinition", referenceId);
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

class PlayerHistory {
    constructor(membershipId, membershipType, characterIds, gamemodes = []) {
        this.membershipId = membershipId;
        this.membershipType = membershipType;
        this.characterIds = characterIds;
        this.gamemodes = gamemodes;
        
        this.seasonStartDate = new Date("2022-12-06");

        // Init storage
        this.stats = {}
        this.activities = {};
        characterIds.forEach(characterId => {
            this.stats[characterId] = {};
            this.activities[characterId] = [];
        })
    }

    async populateFromActivities() {
        for (const characterId of this.characterIds) {
            await this._populateCharacterFromActivities(characterId);
        }
    }

    /**
     * Populate stats for this season only.
     * @param characterId
     * @returns {Promise<void>}
     * @private
     */
    async _populateCharacterFromActivities(characterId) {
        // const instance = this;

        let page = 0
        let result;
        let dailyStats = {}; // { gamemode: {period: Date, values: getEmptyStatsDict() }
        do {
            result = await bungieAPI.fetchActivityHistory(this.membershipId, this.membershipType, characterId, 5, page);

            // Check empty response on page 0
            if (Object.keys(result["Response"]).length === 0) {
                break;
            }

            // Parse activities
            for (const activity of result["Response"]["activities"]) {
                const day = new Date(activity["period"]);
                
                // Handle API gamemode error
                if (activity["activityDetails"]["modes"].includes(0) || (activity["activityDetails"]["mode"] === 0)) {
                    continue;
                }
                
                // Add to activity history
                let activityData = {
                    period: day,
                    mode: activity["activityDetails"]["mode"],
                    modes: activity["activityDetails"]["modes"],
                    instanceId: activity["activityDetails"]["instanceId"],
                    referenceId: activity["activityDetails"]["referenceId"], // Get the map from entityDefinition with this hash
                    duration: activity["values"]["activityDurationSeconds"]["basic"]["value"],
                    values: {
                        "score": activity["values"]["score"]["basic"]["value"],
                        "kills": activity["values"]["kills"]["basic"]["value"],
                        "assists": activity["values"]["assists"]["basic"]["value"],
                        "deaths": activity["values"]["deaths"]["basic"]["value"],
                        "secondsPlayed": activity["values"]["timePlayedSeconds"]["basic"]["value"],
                        "winner": activity["values"]["standing"]["basic"]["value"] < 1,
                    }
                };
                this.activities[characterId].push(activityData);
                
                
                // Add stats from each activity for each gamemode
                // Not optimal - duplicate data - improve by using the activities above
                for (const gamemode of activity["activityDetails"]["modes"]) {
                    // Ensure 'gamemode' key creation
                    if (!(gamemode in this.stats[characterId])) {
                        this.stats[characterId][gamemode] = [];
                    }
                    if (!(gamemode in dailyStats)) {
                        dailyStats[gamemode] = {period: day, values: this.getEmptyStatsDict()};
                    }

                    // Check day
                    if (dateDiffInDays(day, dailyStats[gamemode]["period"]) > 0) {
                        // Append currentDayStats
                        this.stats[characterId][gamemode].push(dailyStats[gamemode]);
                        // reset dailyStats with new day
                        dailyStats[gamemode] = {period: day, values: this.getEmptyStatsDict()};
                    }

                    // Add stats
                    dailyStats[gamemode]["values"]["activitiesEntered"] += 1;
                    if (activity["values"]["standing"]["basic"]["value"] > 0) {
                        dailyStats[gamemode]["values"]["activitiesWon"] += 1;
                    }
                    dailyStats[gamemode]["values"]["kills"] += activity["values"]["kills"]["basic"]["value"];
                    dailyStats[gamemode]["values"]["assists"] += activity["values"]["assists"]["basic"]["value"];
                    dailyStats[gamemode]["values"]["deaths"] += activity["values"]["deaths"]["basic"]["value"];
                    dailyStats[gamemode]["values"]["secondsPlayed"] += activity["values"]["timePlayedSeconds"]["basic"]["value"];
                    dailyStats[gamemode]["values"]["score"] += activity["values"]["score"]["basic"]["value"];
                }
            }
            
            // Next page for api
            ++page;
        } while (Object.keys(result["Response"]).length > 0);

        // Push remaining daily stats
        for (const gamemode in dailyStats) {
            this.stats[characterId][gamemode].push(dailyStats[gamemode]);
        }
    }

    getEmptyStatsDict() {
        return {
            "activitiesEntered": 0,
            "activitiesWon": 0,
            "kills": 0,
            "assists": 0,
            "deaths": 0,
            "secondsPlayed": 0,
            "score": 0,
        }
    }

    _aggregateStats(characterId, gamemode, startDate, endDate) {
        // Sum values between start date and end date
        let dailyStats = this.stats[characterId][gamemode];
        let result = {};

        // Aggregate
        for (const dayStats of dailyStats) {
            if ((dateDiffInDays(startDate, dayStats["period"]) < 0) || (dateDiffInDays(dayStats["period"], endDate) < 0)) {
                continue;
            }

            for (const statName in dayStats["values"]) {
                if (!(statName in result)) {
                    result[statName] = 0;
                }
                result[statName] += dayStats["values"][statName];
            }
        }

        return result;
    }

    getStatsAllTime(characterId, gamemode) {
        // Return dict:
        // {
        //     statName:  value
        // }
        // return this.allTime[characterId][gamemode];
        return this._aggregateStats(characterId, gamemode, new Date("2015-01-01"), new Date());
    }

    getStatsSeasonal(characterId, gamemode) {
        return this._aggregateStats(characterId, gamemode, this.seasonStartDate, new Date());
    }

    /**
     * From reset.
     * @param characterId
     * @param gamemode
     * @returns {{}}
     */
    getStatsWeekly(characterId, gamemode) {
        let lastReset = new Date();
        lastReset.setDate(lastReset.getDate() - (lastReset.getDay() + 5) % 7);
        lastReset.setHours(17, 0, 0);
        return this._aggregateStats(characterId, gamemode, lastReset, new Date());
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