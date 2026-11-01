// https://takeuforward.org/data-structure/prims-algorithm-minimum-spanning-tree-c-and-java-g-45/
#include<bits/stdc++.h>
using namespace std;
vector<pair<pair<int, int>, int>> calculatePrimsMST(int n, int m, vector<pair<pair<int, int>, int>> &g)
{
    // Write your code here.
    vector<pair<pair<int, int>, int>>ans;
    //create adjlist
    unordered_map<int,list<pair<int,int>>>adjlist;
    for(int i=0;i<m;i++){
     int u=g[i].first.first;
     int v=g[i].first.second;
     int weights=g[i].second;
     adjlist[u].push_back({v,weights});
     adjlist[v].push_back({u,weights});
            
    }
    priority_queue<pair<int,int>,vector<pair<int,int>>,greater<pair<int,int>>>q;
    vector<int>key(n+1);
    vector<bool>MST(n+1);
    vector<int>parent(n+1);
    q.push({0,1});
    for(int i=1;i<n+1 ;i++){
        key[i]=INT_MAX;
        MST[i]=0;
        parent[i]=-1;
    } key[1]=0;
    while(!q.empty()){
        
        int u;
        //track minima
      pair<int,int>top=q.top();
        q.pop();
        u=top.second;
         MST[u]=true;//loop ko neglect karna ka liya 
        //update adjacent
        
        for(auto j:adjlist[u]){
               int negh=j.first;
            int wt=j.second;
        if(!MST[negh] && key[negh]>wt){
           
        key[negh]=wt;
        parent[negh]=u;
         q.push({wt,negh});
            }
        }
    } 
    for(int i=1;i<=n;i++){
        if(parent[i]==-1)continue;
        int u=i;
        int v=parent[i];
        
        
        ans.push_back({{v,u},key[i]});
    } return ans;
    
}
