using System.Text.Json.Serialization;

namespace TailSpin.SpaceGame.Web.Models
{
    public class Profile : Model
    {
        //my first change
        // The player's user name.
        [JsonPropertyName("userName")]
        public string UserName { get; set; }

        // The URL of the player's avatar image.
        [JsonPropertyName("avatarUrl")]
        public string AvatarUrl { get; set; }

        // The achievements the player earned.
        [JsonPropertyName("achievements")]
        public string[] Achievements { get; set; }
    }
}
