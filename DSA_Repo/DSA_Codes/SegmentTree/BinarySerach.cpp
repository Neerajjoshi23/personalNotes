// similar to basic similar segment tree
// Now let say we have question of finding where the given exceed the given the sum of element
// we can just find the prefix sum and do a upperbound 
// but what if there is  query that we can change a current element in that case the whole prefix will update
// there come segment tree which can effictively given sum from [0,mid] in log(N)
// Now first query of updating would be of log(N)
// and the finding the index query would be of log^2(N) as one for binary search one for getting the sum

// The structure of segment tree would be similar to binary search so 

// if curr_left_Sum>=target mean left subtree have enough node so i will move to left subtree
// if curr_right_left<target then answer would be in right subtree but while going there i have to reduce it with sum of curr_left_Sum 
// as iam skipping them
// Overall time complexity will be o(log(N))

// when we have to apply binary search over the pref of something

// Question1
// https://leetcode.com/problems/sliding-subarray-beauty/submissions/