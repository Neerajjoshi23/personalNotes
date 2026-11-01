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
int cnr(int n,int r,vector<int>&fac){
     if(r>n) return 0;
     int num=fac[n];
     int den=MOD(fac[n-r],fac[r]);
     den=bnr(den,M-2);
     return MOD(num,den);
}
int pnr(int n,int r,vector<int>&fac){
     if(r>n) return 0;
     int num=fac[n];
     int den=fac[n-r];
     den=bnr(den,M-2);
     return MOD(num,den);
}
 
int ind(char &ch){return (ch-'A');}
const int N=200001;
int up[N][20];
void dfs(int node,int par,unordered_map<int,vector<int>>&adj){
           up[node][0]=par;
           for(int i=1;i<20;i++){
              if(up[node][i-1]==-1) up[node][i]=-1;
              else up[node][i]=up[up[node][i-1]][i-1];
           }
           for(auto child:adj[node]){
               if(child!=par){
                    dfs(child,node,adj);
               }
           }
}
void solve(){
     ll n,q;
     cin>>n>>q;
     unordered_map<int,vector<int>>adj;
     for(int i=2;i<=n;i++){
          ll p;
          cin>>p;
          adj[p].pb(i);
          adj[i].pb(p);
     }
     dfs(1,-1,adj);
    // debug(adj);
     // for(int i=1;i<10;i++){
     //      for(int j=0;j<20;j++) cout<<up[i][j]<<" ";
     //           cout<<endl;
     // }
     while(q--){
          int node,k;
          cin>>node>>k;
          for(int i=19;i>=0;i--){
               if(node==-1 || k==0 ) break;
               if((k&(1<<i))!=0){
                    node=up[node][i];
                    k=k&(~(1<<i));
               }
          }
          cout<<node<<endl;
     }
 
     }
int main() {
#ifndef ONLINE_JUDGE
     freopen("Error.txt", "w", stderr);
#endif 
        // ll t;
        // cin>>t;
        // while(t--)
         solve();
 
}