class BungieAPI {
    constructor(secret_key) {
        this.secret_key = secret_key;
        this.endpoint = "https://www.bungie.net";
        
        // Tokens and rate for bungie api
        this.rate = 20  // Max number of calls per second, Bungie tells us it's 25 but to be sure...
        this.maxTokens = 20
        this.tokens = this.maxTokens;
        this.lastTokenUpdate = (new Date()).getTime();
    }

    async waitForToken() {
        while (this.tokens < 1) {
            this.addNewTokens();
            await sleep(100);
        }
        this.tokens -= 1
    }

    addNewTokens() {
        const now = (new Date()).getTime();
        const timeSinceUpdate = now - this.lastTokenUpdate;
        const newTokens = Math.floor(timeSinceUpdate * this.rate);
        if (this.tokens + newTokens >= 1) {
            this.tokens = Math.min(this.tokens + newTokens, this.maxTokens);
            this.lastTokenUpdate = now;
        }
    }

    async searchPlayer(displayName, displayNameCode) {
        await this.waitForToken();
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
        await this.waitForToken();
        
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
        await this.waitForToken();
        
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
        await this.waitForToken();
        
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

    async fetchEntityDefinition(entityType, hashIdentifier) {
        await this.waitForToken();
        
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

    async fetchMapDefinition(referenceId) {
        await this.waitForToken();
        return await this.fetchEntityDefinition("DestinyActivityDefinition", referenceId);
    }
    
    async fetchCarnageReport(instanceId) {
        await this.waitForToken();

        let targetURL = new URL(`Platform/Destiny2/Stats/PostGameCarnageReport/${instanceId}/`, this.endpoint);

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

    async fetchClanFromMember(membershipId, membershipType) {
        await this.waitForToken();

        let targetURL = new URL(`Platform/GroupV2/User/${membershipType}/${membershipId}/0/1/ `, this.endpoint);

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

    getGamemodeStr(gamemodeInt) {
        const d = {
            "2": "Story",
            "3": "Strike",
            "4": "Raid",
            "5": "All PvP",
            "6": "Patrol",
            "7": "All PvE",
            "9": "Reserved9",
            "10": "Control",
            "11": "Reserved11",
            "12": "Clash",
            "13": "Reserved13",
            "15": "Crimson Doubles",
            "16": "Nightfall",
            "17": "Heroic Nightfall",
            "18": "AllStrikes",
            "19": "IronBanner",
            "20": "Reserved20",
            "21": "Reserved21",
            "22": "Reserved22",
            "24": "Reserved24",
            "25": "AllMayhem",
            "26": "Reserved26",
            "27": "Reserved27",
            "28": "Reserved28",
            "29": "Reserved29",
            "30": "Reserved30",
            "31": "Supremacy",
            "32": "Private Matches All",
            "37": "Survival",
            "38": "Countdown",
            "39": "TrialsOfTheNine",
            "40": "Social",
            "41": "TrialsCountdown",
            "42": "TrialsSurvival",
            "43": "Iron Banner Control",
            "44": "Iron Banner Clash",
            "45": "Iron Banner Supremacy",
            "46": "Scored Nightfall",
            "47": "Scored Heroic Nightfall",
            "48": "Rumble",
            "49": "AllDoubles",
            "50": "Doubles",
            "51": "Private Matches Clash",
            "52": "Private Matches Control",
            "53": "Private Matches Supremacy",
            "54": "Private Matches Countdown",
            "55": "Private Matches Survival",
            "56": "Private Matches Mayhem",
            "57": "Private Matches Rumble",
            "58": "Heroic Adventure",
            "59": "Showdown",
            "60": "Lockdown",
            "61": "Scorched",
            "62": "ScorchedTeam",
            "63": "Gambit",
            "64": "All PvE Competitive",
            "65": "Breakthrough",
            "66": "BlackArmoryRun",
            "67": "Salvage",
            "68": "IronBannerSalvage",
            "69": "PvP Competitive",
            "70": "PvP Quickplay",
            "71": "Clash Quickplay",
            "72": "Clash Competitive",
            "73": "Control Quickplay",
            "74": "Control Competitive",
            "75": "Gambit Prime",
            "76": "Reckoning",
            "77": "Menagerie",
            "78": "Vex Offensive",
            "79": "Nightmare Hunt",
            "80": "Elimination",
            "81": "Momentum",
            "82": "Dungeon",
            "83": "Sundial",
            "84": "Trials Of Osiris",
            "85": "Dares",
            "86": "Offensive",
            "87": "Lost Sector",
            "88": "Rift",
            "89": "Zone Control",
            "90": "IronBannerRift",
            "91": "IronBannerZoneControl"
        };
        return d[gamemodeInt];
    }
    
    getPvPMapInfo(referenceId) {
        // TODO
        const d = {
            "1": {
                name: "Javelin-4",
                pgcrImage: "/img/destiny_content/pgcr/crucible_shaft.jpg",
                description: "Warsat Launch Facility, Io",
            },
        };
        
        return d[referenceId];
    }
}

class PlayerHistory {
    constructor(membershipId, membershipType, characterIds) {
        this.membershipId = membershipId;
        this.membershipType = membershipType;
        this.characterIds = characterIds;

        this.seasonStartDate = new Date("2022-12-06");

        // Init storage
        this.activities = {};
        characterIds.forEach(characterId => {
            this.activities[characterId] = [];
        })
    }

    /**
     * Populate stats for this season only.
     * @param characterId
     * @param startPage included
     * @param endPage not included
     * @param numberOfActivitiesPerPage
     * @returns {Promise<void>}
     * @private
     */
    async populateCharacterFromActivities(characterId, startPage, endPage, numberOfActivitiesPerPage) {
        startPage = Math.min(startPage, 200);
        endPage = Math.min(endPage, 200);

        // Call Bungie API
        let tasks = [];
        for (let i=startPage; i<endPage; i++){
            tasks.push(bungieAPI.fetchActivityHistory(this.membershipId, this.membershipType, characterId, 5, i));
        }
        let results = await Promise.all(tasks); // Increase speed

        for (const result of results) {
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

                // Ensure it's not already here
                if (this.activities[characterId].filter(a => a.instanceId === activity["activityDetails"]["instanceId"]).length > 0) {
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
            }
        }

        // Store in session
        this.save();
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
        let result = this.getEmptyStatsDict();
        startDate = new Date(startDate);
        endDate = new Date(endDate);

        // Aggregate
        for (const activity of this.activities[characterId]) {
            let period = new Date(activity["period"]);

            // Check date
            if (period < startDate) {
                break; // Activites are stored chronologically
            }
            if (period > endDate) {
                continue;
            }

            // Check gamemode
            if (!activity["modes"].includes(parseInt(gamemode))) {
                continue;
            }

            result["activitiesEntered"] += 1;
            result["activitiesWon"] += activity["values"]["winner"] ? 1 : 0;
            result["kills"] += activity["values"]["kills"];
            result["assists"] += activity["values"]["assists"];
            result["deaths"] += activity["values"]["deaths"];
            result["secondsPlayed"] += activity["values"]["secondsPlayed"];
            result["score"] += activity["values"]["score"];
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
        if (lastReset.getDay() === 2){
            lastReset.setDate(lastReset.getDate() - 7);
        } else {
            lastReset.setDate(lastReset.getDate() - (lastReset.getDay() + 5) % 7);
        }
        lastReset.setHours(17, 0, 0);
        return this._aggregateStats(characterId, gamemode, lastReset, new Date());
    }

    getPlayerId() {
        return getPlayerId(this.membershipId, this.membershipType);
    }

    save() {
        let playersHistory = getSessionVariable("playersHistory");
        playersHistory[this.getPlayerId()] = this;
        setSessionVariable("playersHistory", playersHistory);
    }
}

function getPlayerId(membershipId, membershipType) {
    return String(membershipId) + "-" + String(membershipType);
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getSessionVariable(key) {
    let r = sessionStorage.getItem(key);
    if (!r) {
        r = "{}";
    }
    r = JSON.parse(r);
    return r;
}

function setSessionVariable(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
}

// DEBUG
function clearSession() {
    sessionStorage.setItem("playersHistory", "{}");
}


bungieAPI = new BungieAPI('d1afcba184f644bdb4a4bb4a09e51e50');