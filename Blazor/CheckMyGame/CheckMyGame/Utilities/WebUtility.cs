using System.Collections.Specialized;

namespace CheckMyGame.Utilities;

public static class WebUtility
{
    /// <summary>
    /// </summary>
    /// <param name="parameters"></param>
    /// <returns>Returns "key1=value1&key2=value2", all URL-encoded</returns>
    public static string ConstructQueryFromParameters(IDictionary<string, string> parameters)
    {
        NameValueCollection queryString = System.Web.HttpUtility.ParseQueryString(string.Empty);

        foreach (KeyValuePair<string,string> parameter in parameters)
        {
            queryString.Add(parameter.Key, parameter.Value);
        }

        return queryString.ToString() ?? "";
    }
}