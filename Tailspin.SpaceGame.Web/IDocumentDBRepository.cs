using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TailSpin.SpaceGame.Web.Models;

namespace TailSpin.SpaceGame.Web
{
    public interface IDocumentDBRepository<T> where T : Model
    {
        /// <summary>
        /// Retrieves the item from the store with the given identifier.
        /// </summary>
        /// <returns>
        /// A task that represents the asynchronous operation.
        /// The task result contains the retrieved item.
        /// </returns>
        /// <param name="id">The identifier of the item to retrieve.</param>
        Task<T> GetItemAsync(string id);

        /// <summary>
        /// Retrieves items from the store that match the given query predicate.
        /// Results are given in descending order by the given ordering predicate.
        /// </summary>
        /// <returns>
        /// A task that represents the asynchronous operation.
        /// The task result contains the collection of retrieved items.
        /// </returns>
        /// <param name="queryPredicate">Predicate that specifies which items to select.</param>
        /// <param name="orderDescendingPredicate">Predicate that specifies how to sort the results in descending order.</param>
        /// <param name="page">The 1-based page of results to return.</param>
        /// <param name="pageSize">The number of items on a page.</param>

        [TestCase(0, ExpectedResult = 0)]
        [TestCase(1, ExpectedResult = 1)]
        [TestCase(10, ExpectedResult = 10)]
        public int ReturnRequestedCount(int count)
        {
            const int PAGE = 0; // take the first page of results

            // Fetch the scores.
            Task<IEnumerable<Score>> scoresTask = _scoreRepository.GetItemsAsync(
                score => true, // return all scores
                score => 1, // we don't care about the order
                PAGE,
                count // fetch this number of results
            );
            IEnumerable<Score> scores = scoresTask.Result;

            // Verify that we received the specified number of items.
            return scores.Count();


            ReturnRequestedCount(10);
            ReturnRequestedCount(10);
            ReturnRequestedCount(10);

        }


        Task<IEnumerable<T>> GetItemsAsync(
            Func<T, bool> queryPredicate,
            Func<T, int> orderDescendingPredicate,
            int page = 1,
            int pageSize = 10
        );

        /// <summary>
        /// Retrieves the number of items that match the given query predicate.
        /// </summary>
        /// <returns>
        /// A task that represents the asynchronous operation.
        /// The task result contains the number of items that match the query predicate.
        /// </returns>
        /// <param name="queryPredicate">Predicate that specifies which items to select.</param>
        Task<int> CountItemsAsync(Func<T, bool> queryPredicate);
    }
}