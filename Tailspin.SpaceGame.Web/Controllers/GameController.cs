using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using TailSpin.SpaceGame.Web;
using TailSpin.SpaceGame.Web.Models;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace Tailspin.SpaceGame.Web.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GameController : Controller
    {
        // High score repository.
        private readonly IDocumentDBRepository<Score> _scoreRepository;
        // User profile repository.
        private readonly IDocumentDBRepository<Profile> _profileRespository;

        public GameController(
            IDocumentDBRepository<Score> scoreRepository,
            IDocumentDBRepository<Profile> profileRespository
            )
        {
            _scoreRepository = scoreRepository;
            _profileRespository = profileRespository;
        }

        /// <summary>
        /// Returns the entire list of players.
        /// </summary>
        /// <returns></returns>
        // GET: api/<controller>/getplayers
        [HttpGet("getplayers")]
        public async Task<IEnumerable<PlayerScore>> GetPlayers()
        {
            List<PlayerScore> playersScore = new List<PlayerScore>();

            // Form the query predicate.
            // This expression selects all scores that more than zero 
            Expression<Func<Score, bool>> queryPredicate = score =>
                (score.HighScore >0);

            // Fetch the scores that match the current filter.
            IEnumerable<Score> scores = await _scoreRepository.GetItemsAsync(
                queryPredicate
              );
            scores.ToList().ForEach(async score =>
            {
                Profile playerProfile = await _profileRespository.GetItemAsync(score.ProfileId);
                playersScore.Add(
                        new PlayerScore()
                        {
                            Id = playerProfile.Id,
                            UserName = playerProfile.UserName,
                            Score = score
                        }); 

            });
            //_scoreRepository.
            return playersScore;
        }

        /// <summary>
        /// Returns the entire list of players.
        /// </summary>
        /// <returns></returns>
        // GET: api/<controller>/getplayer
        [HttpGet("getplayer")]
        public async Task<PlayerScore> GetPlayer(string playerId)
        {
            // Fetch the profile that match the current filter.
            Profile profile=null;
            try
            {
                profile =
                       await _profileRespository.GetItemAsync(playerId);
            }
            catch (Exception)
            {

                if (profile == null)
                    throw new ArgumentException("This player does not exist");
            }
            // This expression selects all scores that more than zero 
            Expression<Func<Score, bool>> queryPredicate = score =>
                (score.HighScore >0);
            Score playerScore = (await _scoreRepository.GetItemsAsync(queryPredicate))
                                .FirstOrDefault(score=>score.ProfileId==playerId);;
            PlayerScore player = new PlayerScore()
            {
                Id = profile.Id,
                UserName = profile.UserName,
                Score = playerScore
            };

            //_scoreRepository.
            return player;
        }

    }
}
