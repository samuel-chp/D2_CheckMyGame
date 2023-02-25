using DotNetBungieAPI.Models;
using DotNetBungieAPI.Models.User;

namespace CheckMyGame.Utilities;

public static class CrossSaveHandler
{
    public static bool IsCrossSaveEnabledForUser(ICollection<UserInfoCard> userInfoCards, out UserInfoCard targetInfoCard)
    {
        // Init result
        targetInfoCard = new UserInfoCard();
        
        // Empty request
        if (userInfoCards.Count == 0)
        {
            return false;
        }

        // Only one info card, doesn't matter if crossSave is enabled
        // Cross save disable return first result (Attention: multiple profiles can exist)
        bool crossSaveEnabled = userInfoCards.ElementAt(0).СrossSaveOverride != BungieMembershipType.None;
        if (userInfoCards.Count == 1 || !crossSaveEnabled)
        {
            targetInfoCard = userInfoCards.ElementAt(0);
            return false;
        }
        
        // Check for crossSave
        BungieMembershipType crossSaveOverride = userInfoCards.ElementAt(0).СrossSaveOverride;
        foreach (var infoCard in userInfoCards)
        {
            if (infoCard.MembershipType == crossSaveOverride)
            {
                targetInfoCard = infoCard;
                return true;
            }
        }
        
        return true;
    }
}