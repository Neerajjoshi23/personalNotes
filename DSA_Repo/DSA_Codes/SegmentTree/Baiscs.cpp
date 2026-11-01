
#include<bits/stdc++.h>
 
using namespace std;
#define fastio() ios_base::sync_with_stdio(false);cin.tie(NULL);cout.tie(NULL)
#define M 1000000007
#define MOD1 998244353
#define INF 1e18
#define nline "\n"
#define pb push_back
#define ppb pop_back
#define mp make_pair
#define ff first
#define ss second
#define PI 3.141592653589793238462
#define set_bits __builtin_popcountll
#define sz(x) ((int)(x).size())
#define all(x) (x).begin(), (x).end()
 
typedef long long ll;
typedef unsigned long long ull;
typedef long double lld;
// typedef tree<pair<int, int>, null_type, less<pair<int, int>>, rb_tree_tag, tree_order_statistics_node_update > pbds; // find_by_order, order_of_key
 
#ifndef ONLINE_JUDGE
#define debug(x) cerr << #x <<" "; _print(x); cerr << endl;
#else
#define debug(x)
#endif
 
void _print(ll t) {cerr << t;}
void _print(int t) {cerr << t;}
void _print(string t) {cerr << t;}
void _print(char t) {cerr << t;}
void _print(lld t) {cerr << t;}
void _print(double t) {cerr << t;}
void _print(ull t) {cerr << t;}
 
template <class T, class V> void _print(pair <T, V> p);
template <class T> void _print(vector <T> v);
template <class T> void _print(set <T> v);
template <class T, class V> void _print(map <T, V> v);
template <class T> void _print(multiset <T> v);
template <class T, class V> void _print(pair <T, V> p) {cerr << "{"; _print(p.ff); cerr << ","; _print(p.ss); cerr << "}";}
template <class T> void _print(vector <T> v) {cerr << "[ "; for (T i : v) {_print(i); cerr << " ";} cerr << "]";}
template <class T> void _print(set <T> v) {cerr << "[ "; for (T i : v) {_print(i); cerr << " ";} cerr << "]";}
template <class T> void _print(multiset <T> v) {cerr << "[ "; for (T i : v) {_print(i); cerr << " ";} cerr << "]";}
template <class T, class V> void _print(map <T, V> v) {cerr << "[ "; for (auto i : v) {_print(i); cerr << " ";} cerr << "]";}
 
vector<int>fac(100004,1);
int MOD(int a,int b){
     return (1LL*a*b)%M;
}
ll bnr(ll a,ll b){
     ll res=1;
     while(b>0){
          if(b&1){
               res=MOD(res,a);
          }
          a=MOD(a,a);
          b>>=1;
     }
     return res;
}
int cnr(int n,int r){
     if(r>n) return 0;
     int num=fac[n];
     int den=MOD(fac[n-r],fac[r]);
     den=bnr(den,M-2);
     return MOD(num,den);
}
ll modAdd(ll a,ll b){
     return (a+b)%M;
}
ll modMul(ll a,ll b){
     return (a*b)%M;
}
ll countSetBit(ll n){
     ll cnt=0;
     for(int i=63;i>=0;i--){
          if(((1LL<<i)&n)!=0) cnt++;
     }
     return cnt;
}
// const int N=200001;
// int level[N];
// int up[N][20];
// void dfs(int node,int par,unordered_map<int,vector<int>>&adj){
//      up[node][0]=par;
//      debug(node);
//      debug(par);
//      if(par==-1) level[node]=1;
//      else level[node]=level[par]+1;
//      for(int i=1;i<=19;i++){
//           if(up[node][i-1]==-1) up[node][i]=-1;
//           else up[node][i]=up[up[node][i-1]][i-1];
//      }
//      for(auto negh:adj[node]){
//           if(negh!=par) dfs(negh,node,adj);
//      }
// }
// int binary_lift(int node,int k){
 
//      for(int i=19;i>=0;i--){
//           if(k==0 || node==-1) break;
//           if((k&(1<<i))!=0){
//                node=up[node][i];
//                k&=(~(1<<i));
//           }
//      }
//      return node;
// }
// int LCA(int u,int v){
//      if(level[u]<level[v]) swap(u,v);
//      u=binary_lift(u,level[u]-level[v]);
//      if(u==v) return u;
//      for(int i=19;i>=0;i--){
//           if(up[u][i]!=up[v][i]){
//                u=up[u][i];
//                v=up[v][i];
//           }
//      }
//      return binary_lift(u,1);
// }

// Segment tree can be used to solve range queries efficiently
// like range sum with update
// build the segment tree works in O(2N) where N=size of original array
// height of the tree will be log(N)
// all element willl be present at the lesf node
// updating the value in array and the whole segment treee will take log(N) of time
// Used  array way of reresenting the segment tree as it will be effective as in case of
// pointer there will be many tings to keep inn check

const int N=2501;
int segmentTree[4*N];
class seg{
  public:
void build(int ind,int l,int r,vector<int>&arr){
      if(l>r){
          return;
       }
     if(l==r){
        segmentTree[ind]=arr[l];
        return;
     }
     
     int mid=(l+r)/2;
     build(2*ind+1,l,mid,arr);
     build(2*ind+2,mid+1,r,arr);
     segmentTree[ind]=max(segmentTree[2*ind+1],segmentTree[2*ind+2]);
}

void update(int ind,int l,int r,vector<int>&arr,int i,int new_val){
     if(l>r) return;
     if(l==r){
          // reach to the required leaf node
          arr[l]=max(arr[l],new_val);
          segmentTree[ind]=arr[l];
          return;
     }
     int mid=(l+r)/2;
     if(i>mid) update(ind*2+2,mid+1,r,arr,i,new_val);
     else update(ind*2+1,l,mid,arr,i,new_val);
     segmentTree[ind]=max(segmentTree[2*ind+2],segmentTree[2*ind+1]);  
}
int query(int ind,int l,int r,vector<int>&arr,int s,int e){
     if(l>r) return 0;   
     // case 1: No overlap
     if(l>e || s>r) return 0;
     // case 2: Full overlap
     if(l>=s && r<=e) return segmentTree[ind];
     // case 3: Partial Overlap
     int mid=(l+r)/2;
     return max(query(2*ind+2,mid+1,r,arr,s,e),query(ind*2+1,l,mid,arr,s,e));
}
};
// Time Compleity of query will be 2*log(N)
// as we can see it was simply finding and adding in between all nodes of
// required in finding the end nodes value
void solve(){
  
     }
int main() {
#ifndef ONLINE_JUDGE
     freopen("Error.txt", "w", stderr);
#endif 
     fastio();
       //for(int i=2;i<=100003;i++) fac[i]=MOD(fac[i-1],i); 
       //solve();
     // ll t;
     // cin>>t;
     // while(t--) 
     solve();
    
}
