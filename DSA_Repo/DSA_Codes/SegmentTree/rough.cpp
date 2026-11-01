#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    vector<pair<int,int>>arr={{0,1},{2,3},{5,3}};
    int ind=(lower_bound(arr.begin(),arr.end(),make_pair(3,4))-arr.begin());

    return 0;
}