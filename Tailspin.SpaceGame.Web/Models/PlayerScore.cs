using System;
using Newtonsoft.Json;

namespace TailSpin.SpaceGame.Web.Models
{
    /// <summary>
    /// Represents the player's score item.
    /// </summary>
    public class PlayerScore:Model
    {
        // The player's score.
        [JsonProperty("score")]
        public Score Score { get; set; }

        // The player's user name.
        [JsonProperty(PropertyName = "userName")]
        public string UserName { get; set; }
    }
}
